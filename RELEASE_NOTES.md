# MemoryLane v0.20.3

Fixes enterprise database upload failing with a CSRF error.

## What's Changed

- Fixed the database upload endpoint path to match the server's routing convention, resolving CSRF errors on upload
- Enterprise edition now skips the MCP connect step during onboarding

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.20.2...v0.20.3
