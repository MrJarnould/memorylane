# MemoryLane v0.21.0

Enterprise privacy hardening and backend URL improvements.

## What's Changed

- Database uploads now strip sensitive data (OCR text, FTS indexes) before sending to the enterprise backend, keeping only activities, patterns, sightings, and vector embeddings
- Enterprise backend URL uses `/api` prefix and is configurable via `MEMORYLANE_BACKEND_URL` environment variable

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.20.3...v0.21.0
