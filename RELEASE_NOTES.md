# MemoryLane v0.15.0

Minor release focused on the redesigned settings experience, auto-generated user context, live pattern feedback, and clearer model health/status signals.

## What's Changed

- **Settings overhaul** - Advanced settings are consolidated into clearer sections for models, privacy, connections, and capture controls, with model edits autosaving correctly
- **User context builder** - MemoryLane now builds a reusable user context profile from your activity history to improve semantic understanding
- **Pattern feedback loop** - Pattern cards are wired to live database data with persistent thumbs up/down feedback and rejection tracking
- **Model health and status clarity** - The app now surfaces LLM health checks, a simpler status line, and better custom endpoint prefills and validation
- **MCP and plan polish** - Claude setup guidance is easier to collapse when not needed, plan defaults were streamlined, and the plugin integration docs were refreshed

## Features

- Reworked advanced settings UI with clearer grouped sections and better autosave behavior
- Auto-generated user context can now be derived from activity data and reused by semantic features
- Pattern suggestions now use live stored data and keep approve/reject feedback across sessions
- LLM health checks and status indicators make provider/configuration issues easier to spot
- Claude and plugin setup flows are cleaner for users who do not need every integration path

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Linux and Intel macOS are not yet officially supported

## Installation

- macOS (Apple Silicon): install from the latest GitHub release or via the project install script
- Windows: download the latest GitHub release and use either `MemoryLane-Setup.exe` or `MemoryLane-Setup.msi`

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.14.3...v0.15.0
