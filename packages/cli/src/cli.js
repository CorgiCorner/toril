import { readFileSync } from "node:fs";

import { renderHuman } from "./contract.js";
import { DEFAULTS, runDoctor } from "./doctor.js";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const USAGE = `Usage:
  toril [doctor] [-r <redis-url>] [--prefix <prefix>] [--json]

Options:
  -r, --redis <redis-url>  Redis endpoint (default: TORIL_REDIS_URL or redis://127.0.0.1:6379)
  --prefix <prefix>        Bull/BullMQ key prefix (default: bull)
  --json                   Print the stable JSON report
  --help                   Show help
  --version                Show version
`;

function parseArguments(argv, env) {
  const args = [...argv];
  if (args[0] === "doctor") args.shift();
  const options = {
    redisUrl: env.TORIL_REDIS_URL || "redis://127.0.0.1:6379",
    prefix: DEFAULTS.prefix,
    json: false,
  };

  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--help") return { action: "help" };
    if (argument === "--version") return { action: "version" };
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "-r" || argument === "--redis") {
      if (args.length === 0) throw new TypeError("Missing Redis URL.");
      options.redisUrl = args.shift();
      continue;
    }
    if (argument === "--prefix") {
      if (args.length === 0) throw new TypeError("Missing Redis prefix.");
      options.prefix = args.shift();
      continue;
    }
    throw new TypeError("Unsupported option.");
  }
  return { action: "doctor", options };
}

export async function runCli({
  argv = process.argv.slice(2),
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
  doctor = runDoctor,
} = {}) {
  let parsed;
  try {
    parsed = parseArguments(argv, env);
  } catch {
    stderr.write(USAGE);
    return 64;
  }

  if (parsed.action === "help") {
    stdout.write(USAGE);
    return 0;
  }
  if (parsed.action === "version") {
    stdout.write(`${manifest.version}\n`);
    return 0;
  }

  try {
    const report = await doctor(parsed.options);
    stdout.write(parsed.options.json ? `${JSON.stringify(report, null, 2)}\n` : `${renderHuman(report)}\n`);
    return report.exitCode;
  } catch {
    stderr.write("Toril Doctor could not start. Run with --help to check the command.\n");
    return 64;
  }
}
