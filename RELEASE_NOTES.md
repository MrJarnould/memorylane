# MemoryLane v0.22.1

Remote sync is now opt-in.

## What's Changed

- Enterprise remote sync defaults to **Off** on fresh installs. The Summary/Detailed toggle becomes a three-state switch: **Off / Summary / Detailed**. When Off, both the 24h periodic upload and the manual "Sync to Remote" button are suppressed. Existing users keep their prior selection
- Strict gating: the sync gate is re-evaluated on every tick and before every manual upload

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.22.0...v0.22.1
