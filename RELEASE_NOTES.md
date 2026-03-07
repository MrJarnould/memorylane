# MemoryLane v0.14.0

Minor release focused on stronger privacy controls and capture reliability improvements.

## What's Changed

- **Expanded privacy exclusions** - Added app, wildcard URL, and window-title exclusions in Privacy settings to suppress screenshots for sensitive contexts
- **Anonymous browsing protection** - Capture now pauses for browser private/incognito contexts, with hardened Windows matching to avoid leaks
- **Windows app watcher hardening** - Refactored watcher internals and improved URL/event handling for better stability and filtering consistency
- **Runtime and MCP reliability** - Hardened MCP stdio behavior, improved path detection, and added diagnostics/logging for startup and embedding loading

## Features

- Privacy settings now support broader exclusion rules for apps, URLs, and window titles
- Browser anonymous-mode and private-window capture suppression is now integrated into the capture pipeline
- Windows watcher pipeline emits stronger app/window metadata for downstream filtering

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Linux and Intel macOS are not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download `MemoryLane-Setup.exe` from the latest GitHub release

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.13.12...v0.14.0
