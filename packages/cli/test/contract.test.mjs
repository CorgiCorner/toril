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

test("renders product vocabulary without inventing a fourth state", () => {
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

  assert.match(output, /^pass\s+connection - connected/m);
  assert.match(
    output,
    /^not verified\s+maxmemory_policy - can't verify on managed Redis - check the parameter group/m,
  );
  assert.doesNotMatch(output, /unknown|skipped/i);
});
