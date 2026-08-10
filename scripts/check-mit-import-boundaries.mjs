#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const ignoredDirectories = new Set([
  ".git",
  "coverage",
  "dist",
  "graphify-out",
  "node_modules",
]);
const sourceExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

function parseRoot(arguments_) {
  if (arguments_.length === 0) return process.cwd();
  if (arguments_.length === 2 && arguments_[0] === "--root") return resolve(arguments_[1]);
  throw new Error("Usage: check-mit-import-boundaries.mjs [--root PATH]");
}

function isWithin(path, directory) {
  const pathFromDirectory = relative(directory, path);
  return pathFromDirectory === "" || (!pathFromDirectory.startsWith(`..${sep}`) && pathFromDirectory !== "..");
}

function walk(directory, visit, packageRoots = new Set(), packageRoot = undefined) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      if (packageRoot && packageRoots.has(path) && path !== packageRoot) continue;
      walk(path, visit, packageRoots, packageRoot);
    } else if (entry.isFile()) {
      visit(path);
    }
  }
}

function findPackages(root) {
  const packages = [];
  walk(root, (path) => {
    if (!path.endsWith(`${sep}package.json`) && path !== join(root, "package.json")) return;
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    if (!manifest.name || !manifest.license) return;
    packages.push({
      directory: dirname(path),
      license: manifest.license,
      name: manifest.name,
    });
  });
  return packages;
}

function importSpecifiers(source) {
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']/g,
  ];
  return [...new Set(patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1])))];
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/", 1)[0];
}

const root = parseRoot(process.argv.slice(2));
const packages = findPackages(root);
const packagesByName = new Map(packages.map((entry) => [entry.name, entry]));
const packageRoots = new Set(packages.map((entry) => entry.directory));
const mitPackages = packages.filter((entry) => entry.license === "MIT");
const mitRoots = mitPackages.map((entry) => entry.directory);
const violations = [];

for (const package_ of mitPackages) {
  walk(package_.directory, (path) => {
    const extension = path.slice(path.lastIndexOf("."));
    if (!sourceExtensions.has(extension)) return;
    const source = readFileSync(path, "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith("node:")) continue;
      if (specifier.startsWith(".") || isAbsolute(specifier)) {
        const target = resolve(dirname(path), specifier);
        if (!mitRoots.some((directory) => isWithin(target, directory))) {
          violations.push(
            `${relative(root, path)}: MIT package ${package_.name} cannot import code outside MIT package roots (${specifier}).`,
          );
        }
        continue;
      }

      const dependency = packagesByName.get(packageNameFromSpecifier(specifier));
      if (dependency && dependency.license !== "MIT") {
        violations.push(
          `${relative(root, path)}: MIT package ${package_.name} cannot import ${dependency.license} package ${dependency.name}.`,
        );
      }
    }
  }, packageRoots, package_.directory);
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exitCode = 1;
} else {
  console.log(`MIT import boundaries pass for ${mitPackages.length} package(s).`);
}
