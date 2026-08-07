# Public mirror boundaries

The `CorgiCorner/toril` repository is generated from an explicit file inventory
in the private source repository. It contains release snapshots only.

Each public release commit is squashed, authored by the release bot, and bound
to one private source revision through a `GitOrigin-RevId` trailer. Public files
are scanned for secrets and private identifiers before publication.

The public repository must not be edited directly. Release tags are immutable.
