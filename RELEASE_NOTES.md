# MemoryLane v0.13.8

Patch release centered on the first beta of Slack integration.

## What's Changed

- **Slack integration beta** - added app settings for Slack polling, approvals, channel selection, and runtime controls
- **Semantic Slack replies** - MemoryLane can now research recent activity, decide whether context is relevant, and draft short Slack replies before the normal approval flow
- **Better Slack guardrails** - reply drafting now requires an OpenRouter key and skips low-confidence cases instead of posting weak output
- **Minor fixes** - cleaned up missing activity video handling and tightened related tests and logging

## Full Changelog

https://github.com/deusXmachina-dev/memorylane/compare/v0.13.7...v0.13.8
