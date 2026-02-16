# MemoryLane v0.7.0

MemoryLane is a macOS system tray app that captures your screen activity, processes it with OCR and AI summarization, and makes it searchable through an MCP server — giving AI assistants like Claude and Cursor memory of what you've been working on.

## What's Changed

- **Richer activity summaries** — semantic classification now produces more detailed, useful summaries of what you were doing on screen
- **Summary-first MCP guidance** — tool prompts now prioritize activity summaries for "what was I doing?" questions and reserve OCR for exact recall
- **Event-based app change monitoring** — capture timing now reacts more precisely to active app transitions
- **Power usage improvements** — background monitoring was tuned to reduce unnecessary wakeups and improve efficiency
- **Windows preview improvements** — native Windows OCR support and additional platform groundwork landed in this release

## Features

- **One-command install** — `curl | sh` installer that downloads, installs, and removes quarantine automatically
- **Apple notarized** — the app is code-signed and Apple-notarized, no Gatekeeper warnings
- **Managed API key via Stripe** — subscribe and start capturing in seconds, no OpenRouter account needed
- **Multi-screen capture** — captures screenshots from all connected displays simultaneously
- **Event-driven screen capture** — captures screenshots based on user interactions (clicks, typing, scrolling, app switches) and visual changes (perceptual dHash comparison), not fixed intervals
- **OCR via macOS Vision** — extracts text from screenshots using the native Vision framework (Swift sidecar)
- **AI-powered summarization** — classifies activity into concise summaries using vision models via OpenRouter (Mistral Small, GPT-5 Nano, Grok-4.1 Fast, Gemini Flash Lite)
- **Semantic search** — vector embeddings (all-MiniLM-L6-v2) + SQLite FTS5 for full-text and semantic search over your activity history
- **MCP server** — exposes `search_context`, `browse_timeline`, and `get_event_details` tools plus time tracking and recent activity prompts for AI assistants
- **One-click integrations** — register the MCP server with Claude Desktop or Cursor from the tray menu
- **Configurable capture settings** — adjust visual change threshold, typing timeout, scroll timeout via the UI
- **Secure API key storage** — uses Electron's safeStorage for encrypted key persistence
- **Usage tracking** — monitors API requests, token usage, and costs
- **Richer activity summaries** — improved summary quality for timeline and search context questions
- **Windows OCR (preview)** — native OCR path available for Windows preview setups

## Known Issues & Limitations

- **macOS ARM64 release artifact only** — official release assets are currently Apple Silicon macOS (`.zip` and `.dmg`)
- **Windows support is preview quality** — native OCR is available, but some OS-specific UX and setup polish are still in progress
- **Linux and Intel macOS not yet officially supported**

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/deusXmachina-dev/memorylane/main/install.sh | sh
```

This downloads the latest release and installs it to `/Applications`. No Gatekeeper warnings.

After launching:

1. Grant **Screen Recording** permission when prompted
2. Grant **Accessibility** permission when prompted
3. Choose how to provide an API key:
   - **Subscribe** _(recommended)_ — click Subscribe to get a managed key ($10/mo via Stripe)
   - **Bring Your Own Key** — paste your OpenRouter API key if you already have one
4. Optionally register the MCP server with Claude Desktop or Cursor

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.6.2...v0.7.0
