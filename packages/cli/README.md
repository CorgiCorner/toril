# @toril/cli

`@toril/cli` installs the `toril` command. Its first tool is Toril Doctor, a
read-only Redis preflight for Bull and BullMQ queues.

Try the latest published version without installing it globally:

```sh
npx @toril/cli@latest --redis redis://localhost:6379
```

For CI, skip the install prompt and request the stable JSON report:

```sh
npx --yes @toril/cli@latest --redis redis://localhost:6379 --json
```

After a global install, the same checks are available as `toril doctor`.

`doctor` is optional, so `toril -r redis://localhost:6379` runs the same checks.
For credentials, prefer `TORIL_REDIS_URL` instead of placing a password in your
shell history or process arguments.

Toril Doctor checks:

1. connection and `PING`
2. Redis version
3. standalone deployment mode
4. `maxmemory-policy = noeviction`
5. bounded queue discovery with `SCAN`
6. Bull/BullMQ compatibility hints

Redis 6.2 and newer are supported. CI runs the doctor against Redis 6.2, 7.2,
and 8.4.

Every check uses one of the same three states as the Toril console:
`pass`, `fail`, or `not verified`. Bull 3.x detection is deliberately labelled
as a heuristic with `looks legacy (Bull 3.x?)`.

If a managed Redis service blocks `CONFIG`, the result is:

```text
not verified maxmemory-policy: can't verify on managed Redis - check the parameter group

1 of 6 not verified - check the items above.
```

The process exits with `0` for pass, `1` for fail, `2` for not verified, and
`64` for invalid command usage. `--json` emits a stable, versioned report for CI.

At runtime, Toril Doctor makes no network requests except to the Redis endpoint
you provide. It has no telemetry and does not write Redis data.

Toril helps teams check Redis before it carries production Bull and BullMQ
queues. Learn more at [toril.dev](https://toril.dev).

## License

Toril Doctor is licensed under the MIT License. See [LICENSE](LICENSE).
