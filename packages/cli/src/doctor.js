import { assertChecks, CHECK_IDS, exitCodeFor, reportStatus, STATUS } from "./contract.js";
import { createRedisProbe } from "./redis-probe.js";

export const DEFAULTS = Object.freeze({
  prefix: "bull",
  scanLimit: 10_000,
  timeoutMs: 5_000,
});

const BULLMQ_DOCS = "https://docs.bullmq.io/guide/going-to-production";
const QUEUE_SUFFIXES = new Set([
  "active",
  "completed",
  "de",
  "delayed",
  "events",
  "failed",
  "id",
  "limiter",
  "marker",
  "meta",
  "paused",
  "pc",
  "prioritized",
  "repeat",
  "stalled-check",
  "wait",
  "waiting-children",
]);

function check(id, status, message, extra = {}) {
  return { id, status, message, ...extra };
}

function infoFields(info) {
  return Object.fromEntries(
    String(info)
      .split(/\r?\n/u)
      .filter((line) => line && !line.startsWith("#") && line.includes(":"))
      .map((line) => {
        const separator = line.indexOf(":");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function safeCode(error) {
  const code = error?.code;
  return typeof code === "string" && /^[A-Z0-9_]+$/u.test(code) ? code : undefined;
}

function parseTarget(redisUrl) {
  const parsed = new URL(redisUrl);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new TypeError("Redis URL must use redis:// or rediss://.");
  }
  const databaseText = parsed.pathname.replace(/^\//u, "");
  const database = databaseText ? Number.parseInt(databaseText, 10) : 0;
  if (!Number.isSafeInteger(database) || database < 0 || String(database) !== (databaseText || "0")) {
    throw new TypeError("Redis URL contains an invalid database number.");
  }
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : parsed.protocol === "rediss:" ? 6380 : 6379,
    database,
    tls: parsed.protocol === "rediss:",
  };
}

function discoverQueues(keys, prefix) {
  const queues = new Map();
  const prefixWithSeparator = `${prefix}:`;
  for (const key of keys) {
    if (!key.startsWith(prefixWithSeparator)) continue;
    const remainder = key.slice(prefixWithSeparator.length);
    const separator = remainder.lastIndexOf(":");
    if (separator <= 0) continue;
    const name = remainder.slice(0, separator);
    const suffix = remainder.slice(separator + 1);
    if (!QUEUE_SUFFIXES.has(suffix)) continue;
    const suffixes = queues.get(name) ?? new Set();
    suffixes.add(suffix);
    queues.set(name, suffixes);
  }
  return [...queues.entries()]
    .map(([name, suffixes]) => ({ name, hasBullMqMeta: suffixes.has("meta") }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function finalize(target, checks, limits) {
  assertChecks(checks);
  return {
    schemaVersion: 1,
    tool: "toril doctor",
    target,
    status: reportStatus(checks),
    exitCode: exitCodeFor(checks),
    checks,
    limits,
  };
}

export async function runDoctor({
  redisUrl,
  prefix = DEFAULTS.prefix,
  scanLimit = DEFAULTS.scanLimit,
  timeoutMs = DEFAULTS.timeoutMs,
  probe,
}) {
  const target = parseTarget(redisUrl);
  if (!/^[a-zA-Z0-9._:-]+$/u.test(prefix)) throw new TypeError("Redis prefix contains unsupported characters.");
  const limits = { scanKeys: scanLimit, timeoutMs };
  const activeProbe = probe ?? createRedisProbe({ redisUrl, prefix, scanLimit, timeoutMs });
  const checks = [];

  try {
    try {
      await activeProbe.connect();
      const pong = await activeProbe.ping();
      if (pong !== "PONG") throw new Error("Unexpected PING response.");
      checks.push(check("connection", STATUS.PASS, "connected"));
    } catch (error) {
      const code = safeCode(error);
      checks.push(check("connection", STATUS.FAIL, code ? `connection failed (${code})` : "connection failed"));
      for (const id of CHECK_IDS.slice(1)) {
        checks.push(check(id, STATUS.NOT_VERIFIED, "not run because connection failed"));
      }
      return finalize(target, checks, limits);
    }

    let server;
    try {
      server = infoFields(await activeProbe.serverInfo());
      if (server.redis_version) {
        checks.push(check("redis_version", STATUS.PASS, `Redis ${server.redis_version}`));
      } else {
        checks.push(check("redis_version", STATUS.NOT_VERIFIED, "can't verify the Redis version"));
      }
    } catch {
      checks.push(check("redis_version", STATUS.NOT_VERIFIED, "can't verify the Redis version"));
    }

    try {
      let mode = server?.redis_mode;
      if (!mode) {
        const cluster = infoFields(await activeProbe.clusterInfo());
        if (cluster.cluster_enabled === "0") mode = "standalone";
        if (cluster.cluster_enabled === "1") mode = "cluster";
      }
      if (!mode) {
        checks.push(check("deployment_mode", STATUS.NOT_VERIFIED, "can't verify the Redis deployment mode"));
      } else if (mode === "standalone") {
        checks.push(check("deployment_mode", STATUS.PASS, "standalone"));
      } else {
        checks.push(check("deployment_mode", STATUS.FAIL, `${mode} is not supported by this doctor`));
      }
    } catch {
      checks.push(check("deployment_mode", STATUS.NOT_VERIFIED, "can't verify the Redis deployment mode"));
    }

    try {
      const policy = await activeProbe.maxmemoryPolicy();
      if (!policy) {
        checks.push(
          check(
            "maxmemory_policy",
            STATUS.NOT_VERIFIED,
            "can't verify on managed Redis - check the parameter group",
          ),
        );
      } else if (policy === "noeviction") {
        checks.push(check("maxmemory_policy", STATUS.PASS, "maxmemory-policy = noeviction"));
      } else {
        checks.push(
          check(
            "maxmemory_policy",
            STATUS.FAIL,
            `maxmemory-policy = ${policy}; BullMQ requires noeviction`,
            { docs: BULLMQ_DOCS },
          ),
        );
      }
    } catch {
      checks.push(
        check(
          "maxmemory_policy",
          STATUS.NOT_VERIFIED,
          "can't verify on managed Redis - check the parameter group",
        ),
      );
    }

    try {
      const scan = await activeProbe.scan();
      const queues = discoverQueues(scan.keys, prefix);
      const queueNames = queues.map(({ name }) => name);
      if (scan.limited) {
        checks.push(
          check(
            "queue_discovery",
            STATUS.NOT_VERIFIED,
            `SCAN stopped at the ${scanLimit}-key safety limit; queue count is incomplete`,
            { prefix, queues: queueNames },
          ),
        );
        checks.push(
          check(
            "queue_compatibility",
            STATUS.NOT_VERIFIED,
            "can't verify queue compatibility because discovery is incomplete",
          ),
        );
      } else {
        checks.push(
          check(
            "queue_discovery",
            STATUS.PASS,
            `discovered ${queues.length} queues via SCAN (prefix ${prefix}:)`,
            { prefix, queues: queueNames },
          ),
        );
        const legacy = queues.filter(({ hasBullMqMeta }) => !hasBullMqMeta).map(({ name }) => name);
        if (legacy.length === 0) {
          checks.push(
            check(
              "queue_compatibility",
              STATUS.PASS,
              queues.length === 0
                ? "no queues found to classify"
                : "all discovered queues include BullMQ metadata",
            ),
          );
        } else {
          checks.push(
            check(
              "queue_compatibility",
              STATUS.NOT_VERIFIED,
              `looks legacy (Bull 3.x?): ${legacy.join(", ")}; classification is heuristic`,
              { queues: legacy },
            ),
          );
        }
      }
    } catch {
      checks.push(check("queue_discovery", STATUS.NOT_VERIFIED, "can't verify queue discovery with SCAN"));
      checks.push(
        check("queue_compatibility", STATUS.NOT_VERIFIED, "can't verify queue compatibility without discovery"),
      );
    }

    return finalize(target, checks, limits);
  } finally {
    await activeProbe.destroy?.();
  }
}
