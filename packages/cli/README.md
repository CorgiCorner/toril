# Toril Doctor

Toril Doctor is a read-only Redis preflight for Bull and BullMQ queues.

```sh
toril doctor --redis redis://localhost:6379
toril doctor --redis redis://localhost:6379 --json
```

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

Every check uses one of the same three states as the Toril console:
`pass`, `fail`, or `not verified`. Bull 3.x detection is deliberately labelled
as a heuristic with `looks legacy (Bull 3.x?)`.

If a managed Redis service blocks `CONFIG`, the result is:

```text
not verified maxmemory_policy - can't verify on managed Redis - check the parameter group
```

The process exits with `0` for pass, `1` for fail, `2` for not verified, and
`64` for invalid command usage. `--json` emits a stable, versioned report for CI.

At runtime, Toril Doctor makes no network requests except to the Redis endpoint
you provide. It has no telemetry and does not write Redis data.

Toril helps teams check Redis before it carries production Bull and BullMQ
queues. Learn more at [toril.dev](https://toril.dev).

## License

Toril Doctor is licensed under the MIT License. See [LICENSE](LICENSE).
