# Changelog

## Unreleased

## 0.0.6 - 2026-08-10

- Wait up to 10 minutes for a new npm version to become visible before failing verification.
- Made Toril Doctor easier to read, with queue names and a clear summary.
- Added Redis 8.4 to the Doctor test matrix.
- Documented the published `npx @toril/cli@latest` command.

## 0.0.5 - 2026-08-10

- Published Toril Doctor as the MIT-licensed `@toril/cli` package.
- Added a check that keeps MIT packages separate from AGPL server code.

## 0.0.4 - 2026-08-10

- Added Toril Doctor, a read-only Redis preflight for Bull and BullMQ queues.
- Added JSON output and stable exit codes for CI.

## 0.0.3 - 2026-08-08

- Docker Compose now installs the released image, while source builds use a separate development file.
- Each release now verifies and records its exact AMD64 and ARM64 container image.

## 0.0.2 - 2026-08-07

- Published the multi-architecture GHCR image and GitHub Release missing from v0.0.1.

## 0.0.1 - 2026-08-07

- Initial release.

Known issue: v0.0.1 includes the public source snapshot but does not provide a GHCR image or GitHub Release.
