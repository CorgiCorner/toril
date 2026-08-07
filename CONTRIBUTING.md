# Contributing

Toril is developed in a private repository and published here as one snapshot
commit per release. The public history is the release history.

**We don't accept pull requests.** This is deliberate: Toril operates on
production queues, and we keep one coherent design owned by the people who
carry the pager for it. An automated workflow closes external pull requests.
It isn't personal, and it isn't a judgement on your patch.

## What genuinely helps

- Bug reports with a reproduction: Bull or BullMQ version, Redis version, what
  you expected, and what happened.
- Feature requests framed as the problem you hit, not the patch you would
  write.
- Discussions about your setup: queue sizes, deployment shape, and what breaks
  at 3am. This is what shapes the roadmap.

Please describe changes in prose rather than pasting code. Anything you send us
may be used freely and without obligation. Keeping submissions code-free keeps
Toril's ownership unambiguous for everyone.

Reports that lead to a change are credited in the release notes.

**Security issues belong in [SECURITY.md](SECURITY.md).** Never open a public
issue for a vulnerability.

**Forks are your right under AGPL-3.0-only.** The name "Toril" and the logo are
not covered by that license. See [TRADEMARK.md](TRADEMARK.md).
