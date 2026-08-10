import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ships a self-hostable Toril distribution foundation", () => {
  const manifest = JSON.parse(read("package.json"));
  assert.match(manifest.version, /^0\.0\.\d+$/);
  assert.equal(manifest.license, "AGPL-3.0-only");
  assert.match(read("Dockerfile"), /USER 10001:10001/);
  assert.doesNotMatch(read("Dockerfile"), /ARG APP_VERSION=\d/);
  assert.match(read("site/index.html"), /<title>Toril<\/title>/);
  assert.match(read("site/index.html"), /<h1>Toril<\/h1>/);
  assert.match(read("README.md"), new RegExp(`TORIL_VERSION=${manifest.version.replaceAll(".", "\\.")}`));
});

test("installs a released image by default and keeps source builds separate", () => {
  const production = read("docker-compose.yml");
  const development = read("docker-compose.dev.yml");
  assert.doesNotMatch(production, /^\s+build:/m);
  assert.match(production, /ghcr\.io\/corgicorner\/toril:\$\{TORIL_VERSION:\?/);
  assert.match(production, /127\.0\.0\.1:/);
  assert.match(development, /^\s+build:/m);
  assert.match(development, /image: toril:dev/);
});

test("describes the current artifact without claiming a functional dashboard", () => {
  const readme = read("README.md");
  const security = read("SECURITY.md");
  const contributing = read("CONTRIBUTING.md");
  assert.match(readme, /distribution foundation/i);
  assert.match(readme, /Toril Doctor: a read-only Redis\s+preflight for Bull and BullMQ queues/i);
  assert.match(readme, /container still serves a minimal status\s+page and does not connect to Redis/i);
  assert.doesNotMatch(readme, /before product development starts/i);
  assert.doesNotMatch(readme, /pre-release software/i);
  assert.doesNotMatch(security, /has no supported release yet/i);
  assert.match(security, /latest\s+distribution foundation release/i);
  assert.match(contributing, /is intended to\s+operate on production queues/i);
  assert.doesNotMatch(contributing, /Toril operates on\s+production queues/i);
});

test("publishes clear contribution, security, and trademark boundaries", () => {
  const contributing = read("CONTRIBUTING.md");
  assert.match(contributing, /describe changes in prose rather than pasting code/i);
  assert.match(contributing, /may be used freely and without obligation/i);
  assert.match(contributing, /Never open a public\s+issue for a vulnerability/i);
  assert.match(contributing, /TRADEMARK\.md/);

  const security = read("SECURITY.md");
  assert.match(security, /security\/advisories\/new/);
  assert.match(security, /Never open a public issue/i);

  const trademark = read("TRADEMARK.md");
  assert.match(trademark, /does not grant rights to\s+the Toril name or logo/i);
  assert.match(trademark, /hosted services must use a\s+different name and branding/i);
});

test("ships the MIT-licensed Toril Doctor without premature npx instructions", () => {
  const rootManifest = JSON.parse(read("package.json"));
  const doctorManifest = JSON.parse(read("packages/cli/package.json"));
  assert.equal(doctorManifest.name, "toril");
  assert.equal(doctorManifest.version, rootManifest.version);
  assert.equal(doctorManifest.license, "MIT");
  assert.equal(doctorManifest.repository.url, "git+https://github.com/CorgiCorner/toril.git");
  assert.equal(doctorManifest.repository.directory, "packages/cli");
  assert.equal(doctorManifest.bin.toril, "bin/toril.js");
  assert.match(read("packages/cli/LICENSE"), /^MIT License/);

  const packageReadme = read("packages/cli/README.md");
  assert.match(packageReadme, /no telemetry/i);
  assert.match(packageReadme, /no network requests except to the Redis endpoint/i);
  assert.match(packageReadme, /pass`, `fail`, or `not verified`/);
  assert.doesNotMatch(`${read("README.md")}\n${packageReadme}`, new RegExp(["npx", "toril"].join("\\s+"), "i"));
});

test("keeps the doctor runtime network boundary limited to Redis", () => {
  const runtime = [
    "packages/cli/src/cli.js",
    "packages/cli/src/contract.js",
    "packages/cli/src/doctor.js",
    "packages/cli/src/redis-probe.js",
  ].map(read).join("\n");
  assert.doesNotMatch(runtime, /from ["']node:(?:dns|http|https|net|tls)["']/);
  assert.doesNotMatch(runtime, /\bfetch\s*\(/);
  assert.doesNotMatch(runtime, /telemetry/i);
});

test("keeps supported release references aligned", () => {
  const version = JSON.parse(read("package.json")).version.replaceAll(".", "\\.");
  assert.match(read("README.md"), new RegExp("release is `v" + version + "`"));
  assert.match(read("SECURITY.md"), new RegExp("release is currently `v" + version + "`"));
});
