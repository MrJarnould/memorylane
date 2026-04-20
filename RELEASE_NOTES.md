# MemoryLane v0.23.3

macOS enterprise edition and exclusions UI polish.

## What's Changed

- **macOS enterprise (.pkg)**: the enterprise edition now ships for macOS as a signed + notarized `.pkg` installer alongside the Windows MSI. Same runtime as Windows enterprise — license activation, no auto-update, optional DB upload sync.
- **Found banner dismissal persists**: collapsing the "Found (N)" block now sticks across window reopens within a session.
- **Self-filter works in packaged builds**: MemoryLane no longer shows up in its own Found list for customer/enterprise bundles.

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS customer (Apple Silicon): install from the latest GitHub release or via the project install script
- macOS enterprise (Apple Silicon): `MemoryLane Enterprise-arm64-mac.pkg` — delivered privately
- Windows customer: `MemoryLane-Setup.exe`
- Windows enterprise: `MemoryLane Enterprise-Setup.msi` — delivered privately

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.23.1...v0.23.3
