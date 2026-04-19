# MemoryLane v0.23.0

Faster exclusion setup and better Windows app matching.

## What's Changed

- **Auto-fill exclusions from activity**: new "Auto-fill from activity" flow watches app/URL changes for 2 minutes (screen capture suppressed while running) and pre-populates the exclusion lists. A "Just added" pinned section lets you un-toggle anything captured by mistake.
- **Search-first websites picker**: default view shows currently-blocked domains; the search input doubles as add-custom. Matches come from the union of excluded and seen domains.
- **Windows apps picker parity**: Start Menu scanner now resolves `.lnk` targets and uses the target exe stem as the match token, so toggles actually take effect at runtime. Noise entries like `.msc` snap-ins and release notes are dropped (#119).
- Privacy hardening: observation controller edge cases, unified host filter, `newtab` filtered at both entry points, cache TTL on installed-apps list.
- App-watcher fans out to multiple subscribers so observation and interaction-monitor share one native watcher.

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.22.1...v0.23.0
