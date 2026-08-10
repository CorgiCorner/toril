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

export function renderHuman(report) {
  return report.checks
    .map(({ id, status, message, docs }) => {
      const line = `${status.padEnd(12)} ${id} - ${message}`;
      return docs ? `${line}\n${" ".repeat(13)}docs - ${docs}` : line;
    })
    .join("\n");
}
