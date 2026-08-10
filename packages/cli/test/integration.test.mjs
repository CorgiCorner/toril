import assert from "node:assert/strict";
import test from "node:test";

import { createClient } from "@redis/client";

import { STATUS } from "../src/contract.js";
import { runDoctor } from "../src/doctor.js";

const redisUrl = process.env.TORIL_TEST_REDIS_URL;

test("runs through a Redis ACL that permits only doctor commands", { skip: !redisUrl }, async () => {
  const prefix = `toril-test-${process.pid}`;
  const username = `toril_doctor_${process.pid}`;
  const managedUsername = `toril_managed_${process.pid}`;
  const password = `test-${process.pid}-password`;
  const admin = createClient({ url: redisUrl, disableClientInfo: true });
  admin.on("error", () => {});
  await admin.connect();

  const endpoint = new URL(redisUrl);
  const doctorUrl = new URL(redisUrl);
  doctorUrl.username = username;
  doctorUrl.password = password;
  const managedUrl = new URL(redisUrl);
  managedUrl.username = managedUsername;
  managedUrl.password = password;

  try {
    await admin.sendCommand(["HSET", `${prefix}:emails:meta`, "version", "bullmq:5"]);
    await admin.sendCommand(["SET", `${prefix}:emails:id`, "1"]);
    await admin.sendCommand(["SET", `${prefix}:legacy:id`, "1"]);
    await admin.sendCommand(["SET", `${prefix}:legacy:wait`, "job"]);
    await admin.sendCommand([
      "ACL",
      "SETUSER",
      username,
      "on",
      `>${password}`,
      `~${prefix}:*`,
      "+ping",
      "+info",
      "+config|get",
      "+scan",
    ]);
    await admin.sendCommand([
      "ACL",
      "SETUSER",
      managedUsername,
      "on",
      `>${password}`,
      `~${prefix}:*`,
      "+ping",
      "+info",
      "+scan",
    ]);

    const report = await runDoctor({ redisUrl: doctorUrl.href, prefix });
    assert.equal(report.checks.find(({ id }) => id === "connection").status, STATUS.PASS);
    assert.equal(report.checks.find(({ id }) => id === "redis_version").status, STATUS.PASS);
    assert.equal(report.checks.find(({ id }) => id === "deployment_mode").status, STATUS.PASS);
    assert.equal(report.checks.find(({ id }) => id === "maxmemory_policy").status, STATUS.PASS);
    assert.deepEqual(
      report.checks.find(({ id }) => id === "queue_discovery").queues,
      ["emails", "legacy"],
    );
    assert.equal(
      report.checks.find(({ id }) => id === "queue_compatibility").status,
      STATUS.NOT_VERIFIED,
    );

    const managed = await runDoctor({ redisUrl: managedUrl.href, prefix });
    assert.deepEqual(
      managed.checks.find(({ id }) => id === "maxmemory_policy"),
      {
        id: "maxmemory_policy",
        status: STATUS.NOT_VERIFIED,
        message: "can't verify on managed Redis - check the parameter group",
      },
    );
    assert.doesNotMatch(JSON.stringify(managed), new RegExp(password));
    assert.equal(managed.target.host, endpoint.hostname);
  } finally {
    await admin.sendCommand([
      "DEL",
      `${prefix}:emails:meta`,
      `${prefix}:emails:id`,
      `${prefix}:legacy:id`,
      `${prefix}:legacy:wait`,
    ]);
    await admin.sendCommand(["ACL", "DELUSER", username, managedUsername]);
    admin.destroy();
  }
});
