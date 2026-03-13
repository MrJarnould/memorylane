# MemoryLane v0.15.1

Patch release focused on pattern detection controls, a stronger detection pipeline, and integration/status polish.

## What's Changed

- **Pattern detection controls** - Pattern detection can now be turned on or off from settings, with a clearer main window call to action when it is disabled
- **Stronger detection pipeline** - Pattern detection now uses a two-phase agentic flow with tool access, refreshes on window focus, and prunes stale patterns more reliably (#87)
- **Integration and status polish** - MCP status checks are now real-time, browser-native alerts were replaced with app UI, and startup/settings behavior is cleaner
- **Patterns and model UI cleanup** - Pattern cards surface duration estimates more clearly, while model selectors and integration controls stay out of the way unless needed

## Features

- Toggle pattern detection without leaving the app flow
- Improved agentic pattern detection with stale-pattern pruning and better refresh timing
- Live MCP status checks and fewer disruptive dialogs in setup flows
- Clearer pattern cards, integrations UI, and model controls in settings

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Linux and Intel macOS are not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.15.0...v0.15.1
