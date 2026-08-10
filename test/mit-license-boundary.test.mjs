import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const checker = "scripts/check-mit-import-boundaries.mjs";

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "toril-license-boundary-"));
  mkdirSync(join(root, "packages", "cli", "src"), { recursive: true });
  mkdirSync(join(root, "packages", "shared", "src"), { recursive: true });
  mkdirSync(join(root, "packages", "server", "src"), { recursive: true });
  writeJson(join(root, "package.json"), { name: "fixture", license: "AGPL-3.0-only" });
  writeJson(join(root, "packages", "cli", "package.json"), {
    name: "@example/cli",
    license: "MIT",
  });
  writeJson(join(root, "packages", "shared", "package.json"), {
    name: "@example/shared",
    license: "MIT",
  });
  writeJson(join(root, "packages", "server", "package.json"), {
    name: "@example/server",
    license: "AGPL-3.0-only",
  });
  writeFileSync(join(root, "packages", "shared", "src", "index.js"), "export const value = 1;\n");
  writeFileSync(join(root, "packages", "server", "src", "index.js"), "export const server = 1;\n");
  return root;
}

test("allows MIT packages to import MIT packages", () => {
  const root = createFixture();
  try {
    writeFileSync(
      join(root, "packages", "cli", "src", "index.js"),
      'import { value } from "@example/shared";\nexport { value };\n',
    );
    const result = spawnSync(process.execPath, [checker, "--root", root], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("rejects MIT package imports from AGPL packages", () => {
  const root = createFixture();
  try {
    writeFileSync(
      join(root, "packages", "cli", "src", "index.js"),
      'import { server } from "@example/server";\nexport { server };\n',
    );
    const result = spawnSync(process.execPath, [checker, "--root", root], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MIT package @example\/cli cannot import AGPL-3\.0-only package @example\/server/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("rejects relative imports that escape MIT package roots", () => {
  const root = createFixture();
  try {
    writeFileSync(
      join(root, "packages", "cli", "src", "index.js"),
      'import "../../../server.js";\n',
    );
    writeFileSync(join(root, "server.js"), "export const server = 1;\n");
    const result = spawnSync(process.execPath, [checker, "--root", root], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MIT package @example\/cli cannot import code outside MIT package roots/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("current repository respects the MIT import boundary", () => {
  const result = spawnSync(process.execPath, [checker], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
