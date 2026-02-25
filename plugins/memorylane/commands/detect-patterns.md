---
allowed-tools: mcp__memorylane__browse_timeline, mcp__memorylane__search_context, mcp__memorylane__get_activity_details
description: Detect repeated workflow patterns and suggest automations
---

# Detect Patterns

Mine the user's screen activity for repeated processes — the kind a business analyst would document after shadowing someone for a week.

## Instructions

The full analysis methodology, classification taxonomy, and HTML output template live in `skills/pattern-detector/SKILL.md`. This command orchestrates the workflow.

### Step 1 — Scan Day by Day

Pattern detection requires **sequential context** — the order of app switches within a day reveals the loops. Scanning a wide window with a low limit destroys this.

Iterate backwards, one day at a time:

1. `browse_timeline(startTime="today", endTime="now", limit=200, sampling="uniform")`
2. `browse_timeline(startTime="2 days ago", endTime="1 day ago", limit=200, sampling="uniform")`
3. Continue for at least 7 days.
4. If < 10 total activities after 7 days, extend to 14 days.
5. If < 5 total activities after 14 days, tell the user there isn't enough data yet. Stop.

After each day's scan, run Step 2 on that batch before moving to the next day.

### Step 2 — Identify Candidates

For each day's batch, look for the signals described in the skill file — app-switching loops, semantic repetition, multi-step pipelines. Maintain a running candidate list across all days.

A pattern spotted on multiple days is stronger evidence. Merge duplicates and increase confidence.

### Step 3 — Confirm

For each candidate with 3+ occurrences:

1. `search_context(query)` — widen to 30 days to verify the pattern holds.
2. `get_activity_details(ids)` — only for high-confidence candidates where OCR text would reveal automation-relevant specifics. Keep to a minimum.

### Step 4 — Present Results

Use the HTML template from the skill file — pattern cards with type badges, stats, loop structure, what varies vs. what's constant, automation suggestions, and a time-savings footer.

If no patterns found, say so and suggest trying again after a few more days of activity.

## Notes

- **Don't duplicate** — the classification taxonomy, analysis prompt, and HTML template live in `skills/pattern-detector/SKILL.md`. Always reference that file.
- **Noise filtering** — a pattern must appear 3+ times to report. Ignore background behaviors (email, Slack, Reddit).
- **Privacy** — summaries are the primary data source. Only use `get_activity_details` when strictly necessary. Never reproduce raw OCR in the output.
