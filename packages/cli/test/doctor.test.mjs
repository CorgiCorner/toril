import assert from "node:assert/strict";
import test from "node:test";

import { runDoctor } from "../src/doctor.js";
import { STATUS } from "../src/contract.js";

const healthyProbe = (overrides = {}) => ({
  async connect() {},
  async ping() { return "PONG"; },
  async serverInfo() { return "redis_version:7.2.5\r\nredis_mode:standalone\r\n"; },
  async clusterInfo() { return "cluster_enabled:0\r\n"; },
  async maxmemoryPolicy() { return "noeviction"; },
  async scan() {
    return {
      keys: ["bull:emails:meta", "bull:emails:id", "bull:legacy:id", "bull:legacy:wait"],
      limited: false,
    };
  },
  destroy() {},
  ...overrides,
});

test("returns all six checks for a healthy standalone Redis", async () => {
  const report = await runDoctor({
    redisUrl: "redis://localhost:6379",
    probe: healthyProbe({
      async scan() { return { keys: ["bull:emails:meta", "bull:emails:id"], limited: false }; },
    }),
  });

  assert.equal(report.checks.length, 6);
  assert.equal(report.status, STATUS.PASS);
  assert.equal(report.exitCode, 0);
  assert.deepEqual(report.target, {
    host: "localhost",
    port: 6379,
    database: 0,
    tls: false,
  });
});

test("fails a non-noeviction policy with the BullMQ documentation link", async () => {
  const report = await runDoctor({
    redisUrl: "redis://localhost:6379",
    probe: healthyProbe({ async maxmemoryPolicy() { return "allkeys-lru"; } }),
  });
  const check = report.checks.find(({ id }) => id === "maxmemory_policy");

  assert.equal(check.status, STATUS.FAIL);
  assert.match(check.message, /allkeys-lru/);
  assert.equal(check.docs, "https://docs.bullmq.io/guide/going-to-production");
  assert.equal(report.exitCode, 1);
});

test("uses the exact managed Redis copy when CONFIG cannot be verified", async () => {
  const report = await runDoctor({
    redisUrl: "redis://localhost:6379",
    probe: healthyProbe({ async maxmemoryPolicy() { throw new Error("NOPERM"); } }),
  });
  const check = report.checks.find(({ id }) => id === "maxmemory_policy");

  assert.deepEqual(
    { status: check.status, message: check.message },
    {
      status: STATUS.NOT_VERIFIED,
      message: "can't verify on managed Redis - check the parameter group",
    },
  );
  assert.equal(report.exitCode, 2);
});

test("labels Bull 3.x detection as a heuristic", async () => {
  const report = await runDoctor({
    redisUrl: "redis://localhost:6379",
    probe: healthyProbe(),
  });
  const check = report.checks.find(({ id }) => id === "queue_compatibility");

  assert.equal(check.status, STATUS.NOT_VERIFIED);
  assert.match(check.message, /looks legacy \(Bull 3\.x\?\)/);
  assert.match(check.message, /heuristic/i);
  assert.deepEqual(check.queues, ["legacy"]);
});

test("never includes credentials after a connection failure", async () => {
  const report = await runDoctor({
    redisUrl: "rediss://alice:super-secret@example.com:6380/2",
    probe: healthyProbe({
      async connect() { throw new Error("failed rediss://alice:super-secret@example.com:6380/2"); },
    }),
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.status, STATUS.FAIL);
  assert.equal(report.exitCode, 1);
  assert.doesNotMatch(serialized, /alice|super-secret/);
  assert.deepEqual(report.target, {
    host: "example.com",
    port: 6380,
    database: 2,
    tls: true,
  });
});

test("marks queue checks not verified when the bounded scan is incomplete", async () => {
  const report = await runDoctor({
    redisUrl: "redis://localhost:6379",
    probe: healthyProbe({
      async scan() { return { keys: ["bull:emails:meta"], limited: true }; },
    }),
  });

  assert.equal(
    report.checks.find(({ id }) => id === "queue_discovery").status,
    STATUS.NOT_VERIFIED,
  );
  assert.equal(
    report.checks.find(({ id }) => id === "queue_compatibility").status,
    STATUS.NOT_VERIFIED,
  );
  assert.equal(report.exitCode, 2);
});
