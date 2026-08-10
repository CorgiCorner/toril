# Public mirror boundaries

The `CorgiCorner/toril` repository is generated from an explicit file inventory
in the private source repository. It contains release snapshots only.

Each public release commit is squashed, authored by the release bot, and bound
to one private source revision through a `GitOrigin-RevId` trailer. Public files
are scanned for secrets and private identifiers before publication.

The public repository must not be edited directly. Git release tags and
versioned container tags are immutable. The mutable `latest` container tag is
updated only after its versioned image and GitHub Release are verified. Each
GitHub Release carries a `release-manifest.json` that binds the public and
private revisions to the exact multi-architecture image digest.

The server and container are AGPL-3.0-only. npm packages carry their own MIT
license. MIT packages cannot import server code; shared primitives must remain
MIT so the server may depend on them in the permitted direction.
