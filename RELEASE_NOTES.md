# MemoryLane v0.23.5

App is now the MCP entrypoint, with multi-DB support.

## What's Changed

- **No more Node prerequisite for integrations**: one-click setup for Claude Desktop, Claude Code, and Cursor now runs the MemoryLane app directly under `ELECTRON_RUN_AS_NODE=1` instead of shelling out to `npx`. Integrations keep working on machines without Node installed.
- **Reconnect flow for stale entries**: if the app was moved or upgraded, the Integrations panel surfaces a "Reconnect" button instead of silently rewriting config. User-added `--db-path` args are preserved when reconnecting.
- **Multi-DB via `set_db_path` / `reset_db_path`**: the MCP server can now be pointed at a different MemoryLane database at runtime. The recorder always writes to the default DB — `set_db_path` only affects what the MCP server reads.

## Known Issues & Limitations

- Windows OCR still depends on native OCR component availability
- Intel macOS is not yet officially supported

## Installation

- macOS customer (Apple Silicon): install from the latest GitHub release or via the project install script
- macOS enterprise (Apple Silicon): `MemoryLane Enterprise-arm64-mac.pkg` — delivered privately
- Windows customer: `MemoryLane-Setup.exe`
- Windows enterprise: `MemoryLane Enterprise-Setup.msi` — delivered privately

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.23.4...v0.23.5
