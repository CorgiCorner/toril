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
  assert.match(readme, /does not connect to Redis or inspect Bull or BullMQ queues/i);
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
