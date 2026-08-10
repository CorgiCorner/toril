import assert from "node:assert/strict";
import test from "node:test";

import { runCli } from "../src/cli.js";

const stream = () => ({
  value: "",
  write(chunk) { this.value += chunk; },
});

test("supports JSON output and the short Redis option", async () => {
  const stdout = stream();
  const stderr = stream();
  const exitCode = await runCli({
    argv: ["-r", "redis://localhost:6379", "--json"],
    stdout,
    stderr,
    doctor: async () => ({
      schemaVersion: 1,
      status: "pass",
      exitCode: 0,
      checks: [],
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(stderr.value, "");
  assert.deepEqual(JSON.parse(stdout.value), {
    schemaVersion: 1,
    status: "pass",
    exitCode: 0,
    checks: [],
  });
});

test("accepts doctor as an explicit command", async () => {
  let received;
  const exitCode = await runCli({
    argv: ["doctor", "--redis", "redis://localhost:6380", "--prefix", "jobs"],
    stdout: stream(),
    stderr: stream(),
    doctor: async (options) => {
      received = options;
      return { status: "pass", exitCode: 0, checks: [] };
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(received.redisUrl, "redis://localhost:6380");
  assert.equal(received.prefix, "jobs");
});

test("returns 64 for invalid usage without echoing a supplied secret", async () => {
  const stdout = stream();
  const stderr = stream();
  const exitCode = await runCli({
    argv: ["--redis", "redis://alice:super-secret@example.com:6379", "--bad-option"],
    stdout,
    stderr,
  });

  assert.equal(exitCode, 64);
  assert.match(stderr.value, /Usage:/);
  assert.doesNotMatch(stderr.value, /alice|super-secret/);
});
