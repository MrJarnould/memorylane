# MemoryLane v0.13.12

Patch release focused on packaging reliability and settings UX cleanup.

## What's Changed

- **Bundled embedding model** - Added model bundling in app builds so semantic capabilities are available without extra manual setup (`#71`)
- **Advanced settings refactor** - Split the advanced settings page into focused section components for easier navigation and future maintenance
- **Release workflow updates** - Refined release/package lock handling and release helper skill instructions

## Features

- Local embedding model assets are now shipped with the app package
- Advanced settings UI is organized into clearer sections

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Linux and Intel macOS are not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download `MemoryLane-Setup.exe` from the latest GitHub release

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.13.11...v0.13.12
