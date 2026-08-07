import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ships a self-hostable Toril preview", () => {
  const manifest = JSON.parse(read("package.json"));
  assert.equal(manifest.version, "0.0.1");
  assert.equal(manifest.license, "AGPL-3.0-only");
  assert.match(read("Dockerfile"), /USER 10001:10001/);
  assert.match(read("Caddyfile"), /\/healthz/);
  assert.match(read("site/index.html"), /<title>Toril<\/title>/);
  assert.match(read("site/index.html"), /<h1>Toril<\/h1>/);
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
