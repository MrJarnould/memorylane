---
allowed-tools: mcp__memorylane__list_patterns, mcp__memorylane__get_pattern_details, mcp__memorylane__search_context, mcp__memorylane__get_activity_details
description: Review detected patterns and surface the best automation candidates
---

# Review Patterns

Curate the raw output from MemoryLane's pattern detector. Filter aggressively, score what survives, polish the top candidates, and present them as actionable automation opportunities.

## Instructions

### Step 1 — Fetch All Patterns

Call `list_patterns()` to get every detected pattern. Each pattern includes: id, name, description, apps, automationIdea, sightingCount, lastSeenAt, lastConfidence.

If there are zero patterns, tell the user: "No patterns detected yet. Run `/discover-patterns` first, or wait for the daily detector to accumulate data." Stop.

### Step 2 — Score and Filter

This step is pure reasoning — no tool calls.

#### Scoring

Score each pattern on 4 dimensions (each 0–2.5, composite 0–10):

| Dimension       | 2.5 (strong)                                     | 0 (discard)                |
| --------------- | ------------------------------------------------ | -------------------------- |
| **Repetition**  | 5+ sightings, seen within last 7 days            | 1 sighting, sounds one-off |
| **Cross-app**   | 3+ apps, clear data flow between them            | Single-app pattern         |
| **Feasibility** | Public APIs exist, linear workflow               | Requires human judgment    |
| **Specificity** | Named apps, described data/fields, clear trigger | Generic ("uses browser")   |

#### Hard Cuts — Discard Regardless of Score

- **Matches discard list:**
  - Personal messaging (iMessage, WhatsApp, Telegram, Discord DMs, Signal)
  - Learning/studying (docs, tutorials, papers, Stack Overflow, course platforms)
  - General browsing (Reddit, HN, news, shopping, social media)
  - Programming (writing code, debugging, tests, PRs, commits, code review)
  - Entertainment (Spotify, Netflix, YouTube non-work, games)
  - Email/Slack triage (general inbox checking, message reading — unless it triggers a specific cross-app workflow)
  - IDE usage alone ("uses VS Code", "writes code in Cursor")
  - File management (unless part of a larger cross-app workflow)
- **Confidence < 30% AND sightingCount = 1**
- **Description is just app usage with no workflow** (e.g., "user uses Chrome frequently")

#### Threshold

- Composite score must be >= 5.0 to survive.
- Cap at top 8 if more survive. Rank by composite score descending.

### Step 3 — Evidence Gathering

Selective tool calls on top candidates only:

1. **`get_pattern_details`** for the top 3 surviving patterns — get sighting history, evidence text, and linked activity IDs.
2. **`search_context`** for the top 1–2 patterns — verify the pattern holds across a wider 30-day window. Use a query that captures the core workflow (e.g., the key apps + action).
3. **`get_activity_details`** only if a pattern's automation idea needs specific data fields (URLs, field names, data being moved). Max 5 activity IDs, max 2 patterns. Do NOT reproduce raw OCR containing passwords, API keys, or personal messages.

Use findings from this step to adjust scores or discard patterns that don't hold up under scrutiny.

### Step 4 — Polish and Present

For each surviving pattern, rewrite:

- **Name**: action-oriented — "[Verb] [object] [qualifier]" (e.g., "Sync Stripe transactions to QuickBooks")
- **Description**: 1–2 crisp sentences on what happens and what data moves where
- **Category**: one of Data Shuttle / Reporting Ritual / Review Pipeline / Data Entry / Alert Response
- **Automation idea**: specific approach — name the API, tool, or method
- **Effort**: Easy / Medium / Hard
- **Time savings estimate**: per week

Output the review as markdown (not HTML):

```
## Pattern Review — {N} candidates from {total} detected

{1-line summary of overall findings}

---

### 1. {polished_name}

**Category:** {category} | **Apps:** {apps} | **Sightings:** {count} | **Confidence:** {pct}%

{polished description}

**Automation:** {polished approach}
**Effort:** {effort} | **Est. time saved:** {estimate}/week

---

### 2. {polished_name}

...
```

End with a filter summary: "{X} patterns discarded ({brief breakdown — e.g., '3 programming, 2 browsing, 1 too generic'})."

If no patterns survive filtering, say so directly: "All {N} detected patterns were filtered out ({breakdown}). The detector is picking up casual activity rather than cross-app workflows. Try again after a week that includes operational work like data entry, reporting, or cross-tool data movement."

### Step 5 — Prompt for Next Steps

Use `AskUserQuestion` with two interactive prompts built dynamically from surviving patterns:

```json
{
  "questions": [
    {
      "question": "Which patterns do you want to act on?",
      "header": "Patterns",
      "options": [
        {
          "label": "1. {polished_name}",
          "description": "{short_description}"
        },
        {
          "label": "2. {polished_name}",
          "description": "{short_description}"
        }
      ],
      "multiSelect": true
    },
    {
      "question": "What should I do next?",
      "header": "Next step",
      "options": [
        {
          "label": "Create PDF briefing",
          "description": "Generate a process description document — via /pattern-to-pdf"
        },
        {
          "label": "Create automation runbook",
          "description": "Generate a step-by-step automation runbook — via /pattern-to-runbook"
        },
        {
          "label": "Dig deeper",
          "description": "Gather more evidence — inspect OCR, widen search window, verify edge cases"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

Generate one option per surviving pattern in the first question (up to 8).

After the user responds:

- **Create PDF briefing** — invoke `/pattern-to-pdf` for each selected pattern.
- **Create automation runbook** — invoke `/pattern-to-runbook` for each selected pattern.
- **Dig deeper** — for each selected pattern, call `get_pattern_details` and `get_activity_details` with a broader set of activity IDs, then present updated findings with more specific automation recommendations.

## Notes

- **This command curates, it doesn't detect.** Detection is done by the daily kimi-k2.5 runs. This command applies a stronger model to filter, score, and polish those results.
- **Aggressive filtering philosophy** — most detected patterns are noise. A pattern that doesn't fit one of the 5 categories (Data Shuttle, Reporting Ritual, Review Pipeline, Data Entry, Alert Response) doesn't make the cut.
- **Privacy** — never reproduce raw OCR containing passwords, API keys, or personal messages in the output.
