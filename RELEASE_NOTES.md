# MemoryLane v0.15.5

Patch release focused on safer updater installs.

## What's Changed

- **Updater rechecks before install** - MemoryLane now verifies update state again before starting installation, reducing stale or duplicate install attempts

## Features

- Auto-updates revalidate the pending release before installation begins

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Linux and Intel macOS are not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.15.4...v0.15.5
