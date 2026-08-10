import assert from "node:assert/strict";
import test from "node:test";

import {
  CHECK_IDS,
  STATUS,
  exitCodeFor,
  reportStatus,
  renderHuman,
} from "../src/contract.js";

test("uses the six product checks and the shared three-state vocabulary", () => {
  assert.deepEqual(CHECK_IDS, [
    "connection",
    "redis_version",
    "deployment_mode",
    "maxmemory_policy",
    "queue_discovery",
    "queue_compatibility",
  ]);
  assert.deepEqual(STATUS, {
    PASS: "pass",
    FAIL: "fail",
    NOT_VERIFIED: "not verified",
  });
});

test("uses stable report status and exit codes", () => {
  const pass = [{ status: STATUS.PASS }];
  const incomplete = [{ status: STATUS.PASS }, { status: STATUS.NOT_VERIFIED }];
  const failed = [{ status: STATUS.NOT_VERIFIED }, { status: STATUS.FAIL }];

  assert.equal(reportStatus(pass), STATUS.PASS);
  assert.equal(exitCodeFor(pass), 0);
  assert.equal(reportStatus(incomplete), STATUS.NOT_VERIFIED);
  assert.equal(exitCodeFor(incomplete), 2);
  assert.equal(reportStatus(failed), STATUS.FAIL);
  assert.equal(exitCodeFor(failed), 1);
});

test("renders human labels, queue names, and a closing success summary", () => {
  const output = renderHuman({
    status: STATUS.PASS,
    checks: [
      { id: "connection", status: STATUS.PASS, message: "connected" },
      { id: "redis_version", status: STATUS.PASS, message: "Redis 8.4.0" },
      { id: "deployment_mode", status: STATUS.PASS, message: "standalone" },
      {
        id: "maxmemory_policy",
        status: STATUS.PASS,
        message: "maxmemory-policy = noeviction",
      },
      {
        id: "queue_discovery",
        status: STATUS.PASS,
        message: "discovered 2 queues via SCAN (prefix bull:)",
        queues: ["emails:transactional", "invoices:sync"],
      },
      {
        id: "queue_compatibility",
        status: STATUS.PASS,
        message: "all discovered queues include BullMQ metadata",
      },
    ],
  });

  assert.equal(
    output,
    [
      "pass         Connection: connected",
      "pass         Redis 8.4.0 · standalone",
      "pass         maxmemory-policy: noeviction",
      "pass         Queue discovery: discovered 2 queues via SCAN (prefix bull:): emails:transactional, invoices:sync",
      "pass         Queue compatibility: all discovered queues include BullMQ metadata",
      "",
      "6/6 checks passed - your queues are ready.",
      "The console ships with v0.1 · toril.dev",
    ].join("\n"),
  );
  assert.doesNotMatch(output, /redis_version|maxmemory_policy|queue_discovery/u);
});

test("closes failed and not verified runs with the next action", () => {
  const failed = renderHuman({
    status: STATUS.FAIL,
    checks: [
      { id: "connection", status: STATUS.PASS, message: "connected" },
      { id: "redis_version", status: STATUS.PASS, message: "Redis 8.4.0" },
      { id: "deployment_mode", status: STATUS.PASS, message: "standalone" },
      {
        id: "maxmemory_policy",
        status: STATUS.FAIL,
        message: "maxmemory-policy = allkeys-lru; BullMQ requires noeviction",
        docs: "https://docs.bullmq.io/guide/going-to-production",
      },
      {
        id: "queue_discovery",
        status: STATUS.PASS,
        message: "discovered 0 queues via SCAN (prefix bull:)",
        queues: [],
      },
      {
        id: "queue_compatibility",
        status: STATUS.PASS,
        message: "no queues found to classify",
      },
    ],
  });

  assert.match(failed, /^fail\s+maxmemory-policy: allkeys-lru; BullMQ requires noeviction$/mu);
  assert.match(failed, /1 of 6 failed - fix maxmemory-policy first\.$/mu);

  const output = renderHuman({
    status: STATUS.NOT_VERIFIED,
    checks: [
      { id: "connection", status: STATUS.PASS, message: "connected" },
      {
        id: "maxmemory_policy",
        status: STATUS.NOT_VERIFIED,
        message: "can't verify on managed Redis - check the parameter group",
      },
    ],
  });

  assert.match(output, /^pass\s+Connection: connected/mu);
  assert.match(
    output,
    /^not verified\s+maxmemory-policy: can't verify on managed Redis - check the parameter group/mu,
  );
  assert.match(output, /1 of 2 not verified - check the items above\.$/mu);
  assert.doesNotMatch(output, /unknown|skipped/i);
});

test("caps queue names in human output", () => {
  const output = renderHuman({
    status: STATUS.PASS,
    checks: [
      {
        id: "queue_discovery",
        status: STATUS.PASS,
        message: "discovered 4 queues via SCAN (prefix bull:)",
        queues: ["emails", "invoices", "reports", "webhooks"],
      },
    ],
  });

  assert.match(output, /Queue discovery: .*: emails, invoices, \+2 more/mu);
});

test("does not let queue names control the terminal", () => {
  const output = renderHuman({
    status: STATUS.PASS,
    checks: [
      {
        id: "queue_discovery",
        status: STATUS.PASS,
        message: "discovered 2 queues via SCAN (prefix bull:)",
        queues: [`emails\u001b[31m`, "x".repeat(120)],
      },
    ],
  });

  assert.doesNotMatch(output, /\u001b/u);
  assert.match(output, /emails\?\[31m/u);
  assert.match(output, /\.\.\./u);
  assert.ok(output.length < 400);
});
