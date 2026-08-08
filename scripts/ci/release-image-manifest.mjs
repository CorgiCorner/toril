#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const imagePattern = /^ghcr\.io\/[a-z0-9-]+\/[a-z0-9-]+$/;
const shaPattern = /^[0-9a-f]{40}$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const supportedPlatforms = ["linux/amd64", "linux/arm64"];

function required(value, label) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function options(argv) {
  const parsed = { command: argv[0] };
  for (let index = 1; index < argv.length; index += 1) {
    const item = argv[index];
    if (["--digest", "--image", "--manifest", "--origin-sha", "--source-sha", "--version"].includes(item)) {
      parsed[item.slice(2).replaceAll("-", "_")] = argv[++index];
    } else throw new Error(`Unknown argument: ${item}`);
  }
  return parsed;
}

function expectedManifest(parsed) {
  const version = required(parsed.version, "--version");
  const sourceSha = required(parsed.source_sha, "--source-sha");
  const originSha = required(parsed.origin_sha, "--origin-sha");
  const image = required(parsed.image, "--image");
  const digest = required(parsed.digest, "--digest");
  if (!versionPattern.test(version)) throw new Error(`Invalid version: ${version}`);
  if (!shaPattern.test(sourceSha)) throw new Error(`Invalid source SHA: ${sourceSha}`);
  if (!shaPattern.test(originSha)) throw new Error(`Invalid origin SHA: ${originSha}`);
  if (!imagePattern.test(image)) throw new Error(`Invalid image: ${image}`);
  if (!digestPattern.test(digest)) throw new Error(`Invalid image digest: ${digest}`);
  return {
    schemaVersion: 1,
    version,
    sourceSha,
    originSha,
    image: `${image}@${digest}`,
    platforms: supportedPlatforms,
  };
}

const parsed = options(process.argv.slice(2));
const manifestPath = required(parsed.manifest, "--manifest");
const expected = expectedManifest(parsed);

if (parsed.command === "create") {
  writeFileSync(manifestPath, `${JSON.stringify(expected, null, 2)}\n`);
  console.log(`Created release image manifest for ${expected.version}.`);
} else if (parsed.command === "verify") {
  const actual = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Release image manifest does not match the expected release.");
  }
  console.log(`Verified release image manifest for ${expected.version}.`);
} else {
  throw new Error(`Unknown command: ${parsed.command ?? "missing"}`);
}
