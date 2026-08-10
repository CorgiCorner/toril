export const CHECK_IDS = Object.freeze([
  "connection",
  "redis_version",
  "deployment_mode",
  "maxmemory_policy",
  "queue_discovery",
  "queue_compatibility",
]);

export const STATUS = Object.freeze({
  PASS: "pass",
  FAIL: "fail",
  NOT_VERIFIED: "not verified",
});

const VALID_STATUSES = new Set(Object.values(STATUS));
const HUMAN_LABELS = Object.freeze({
  connection: "Connection",
  redis_version: "Redis version",
  deployment_mode: "Deployment mode",
  maxmemory_policy: "maxmemory-policy",
  queue_discovery: "Queue discovery",
  queue_compatibility: "Queue compatibility",
});

const FIX_LABELS = Object.freeze({
  connection: "connection",
  redis_version: "Redis version",
  deployment_mode: "deployment mode",
  maxmemory_policy: "maxmemory-policy",
  queue_discovery: "queue discovery",
  queue_compatibility: "queue compatibility",
});

export function reportStatus(checks) {
  if (checks.some(({ status }) => status === STATUS.FAIL)) return STATUS.FAIL;
  if (checks.some(({ status }) => status === STATUS.NOT_VERIFIED)) return STATUS.NOT_VERIFIED;
  return STATUS.PASS;
}

export function exitCodeFor(checks) {
  const status = reportStatus(checks);
  if (status === STATUS.FAIL) return 1;
  if (status === STATUS.NOT_VERIFIED) return 2;
  return 0;
}

export function assertChecks(checks) {
  if (checks.length !== CHECK_IDS.length) throw new Error("Doctor must return exactly six checks.");
  for (const [index, check] of checks.entries()) {
    if (check.id !== CHECK_IDS[index]) throw new Error(`Unexpected doctor check: ${check.id}.`);
    if (!VALID_STATUSES.has(check.status)) throw new Error(`Unexpected doctor status: ${check.status}.`);
  }
}

function humanText(value, maxLength = 240) {
  const clean = String(value).replace(/[\u0000-\u001f\u007f-\u009f]/gu, "?");
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 3)}...` : clean;
}

function queueNames(queues = []) {
  if (queues.length === 0) return "";
  const visible = queues.slice(0, 2).map((name) => humanText(name, 80)).join(", ");
  const remaining = queues.length - 2;
  return remaining > 0 ? `${visible}, +${remaining} more` : visible;
}

function humanMessage({ id, status, message, queues }) {
  const safeMessage = humanText(message);
  if (id === "redis_version" && status === STATUS.PASS && safeMessage.startsWith("Redis ")) {
    return safeMessage;
  }
  if (id === "maxmemory_policy") {
    return safeMessage.startsWith("maxmemory-policy = ")
      ? safeMessage.replace("maxmemory-policy = ", "maxmemory-policy: ")
      : `maxmemory-policy: ${safeMessage}`;
  }
  const names = id === "queue_discovery" ? queueNames(queues) : "";
  const detail = names ? `${safeMessage}: ${names}` : safeMessage;
  return `${HUMAN_LABELS[id]}: ${detail}`;
}

function closingSummary(checks) {
  const failed = checks.filter(({ status }) => status === STATUS.FAIL);
  if (failed.length > 0) {
    return `${failed.length} of ${checks.length} failed - fix ${FIX_LABELS[failed[0].id]} first.`;
  }
  const notVerified = checks.filter(({ status }) => status === STATUS.NOT_VERIFIED);
  if (notVerified.length > 0) {
    return `${notVerified.length} of ${checks.length} not verified - check the items above.`;
  }
  return [
    `${checks.length}/${checks.length} checks passed - your queues are ready.`,
    "The console ships with v0.1 · toril.dev",
  ].join("\n");
}

export function renderHuman(report) {
  const lines = [];
  for (let index = 0; index < report.checks.length; index += 1) {
    const check = report.checks[index];
    const next = report.checks[index + 1];
    if (
      check.id === "redis_version" &&
      check.status === STATUS.PASS &&
      next?.id === "deployment_mode" &&
      next.status === STATUS.PASS
    ) {
      lines.push(
        `${check.status.padEnd(12)} ${humanText(check.message)} · ${humanText(next.message)}`,
      );
      index += 1;
    } else {
      const line = `${check.status.padEnd(12)} ${humanMessage(check)}`;
      lines.push(check.docs ? `${line}\n${" ".repeat(13)}docs: ${humanText(check.docs)}` : line);
    }
  }
  return `${lines.join("\n")}\n\n${closingSummary(report.checks)}`;
}
