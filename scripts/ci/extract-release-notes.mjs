#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

function required(value, label) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function options(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (["--changelog", "--output", "--version"].includes(item)) {
      parsed[item.slice(2)] = argv[++index];
    } else throw new Error(`Unknown argument: ${item}`);
  }
  return parsed;
}

export function extractReleaseNotes(changelog, version) {
  const normalizedVersion = version.replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(normalizedVersion)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  const escapedVersion = normalizedVersion.replaceAll(".", "\\.");
  const heading = new RegExp(`^## ${escapedVersion} - \\d{4}-\\d{2}-\\d{2}$`, "m");
  const match = heading.exec(changelog);
  if (!match) throw new Error(`CHANGELOG.md has no release section for ${normalizedVersion}.`);
  const bodyStart = match.index + match[0].length;
  const remaining = changelog.slice(bodyStart).replace(/^\n+/, "");
  const nextHeading = remaining.search(/^## /m);
  const notes = (nextHeading === -1 ? remaining : remaining.slice(0, nextHeading)).trim();
  if (!notes) throw new Error(`Release notes for ${normalizedVersion} are empty.`);
  return `${notes}\n`;
}

const parsed = options(process.argv.slice(2));
const version = required(parsed.version, "--version");
const output = required(parsed.output, "--output");
const changelog = readFileSync(parsed.changelog ?? "CHANGELOG.md", "utf8");
writeFileSync(output, extractReleaseNotes(changelog, version));
console.log(`Extracted release notes for ${version}.`);
