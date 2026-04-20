# MemoryLane v0.23.1

Privacy and Windows stability fixes.

## What's Changed

- **Auto-fill is now opt-in**: discovered apps/sites appear in a "Found (N)" block with toggles off — you pick what to block, or click **Add all**. Previously items were auto-added to exclusions (#121).
- **Windows MSI upgrades unbroken**: native helper processes are now killed on quit so the installer can replace them during upgrade (#120).
- Per-tab dismiss: collapsing the Found block for Apps no longer collapses it for Websites (and vice versa).

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.23.0...v0.23.1
