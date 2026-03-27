---
name: pattern-to-runbook
allowed-tools: mcp__memorylane__browse_timeline, mcp__memorylane__search_context, mcp__memorylane__get_activity_details
description: Generate an automation runbook from a workflow pattern
---

# Pattern to Runbook

Generate a step-by-step automation runbook (`.md` file) from a workflow pattern. The pattern can come from a previous `/discover-patterns` session or be described directly by the user.

## Instructions

### Step 1 — Identify the Pattern

- **If the user described a pattern** (e.g., "the thing where I copy data from Stripe to Google Sheets every Monday"): use that description as-is. Proceed to Step 2 to find evidence.
- **If the user referenced a pattern from a previous `/discover-patterns` run**: use the pattern name and details they shared. Proceed to Step 2.
- **If no pattern was specified**: ask the user to describe the workflow they want to turn into a runbook, or suggest they run `/discover-patterns` first to find candidates.

### Step 2 — Gather Full Context

Use the timeline and activity tools to build a complete picture of the workflow:

1. `search_context(query)` — search for activities matching the pattern across 30 days to find all instances.
2. `browse_timeline` — for the strongest matches, scan the surrounding timeline to capture the full workflow sequence (steps before and after the core actions).
3. `get_activity_details(ids)` — for at least 3 clear instances, extract exact steps, apps, URLs, UI elements, and data flow.

The goal is to reconstruct the complete process from trigger to completion, and to understand what varies vs. what stays the same across runs.

### Step 3 — Reconstruct and Analyze

From the evidence, map the complete workflow from trigger to completion:

- What triggers it (email arrival, time of day, manual decision)
- Each step in order: what app, what action, what data moves where
- How the user knows it's done
- How long it typically takes (from activity timestamps)

Cross-reference multiple instances to reconstruct the complete sequence. Then separate:

- **Variables** — parameters that change each run (client name, invoice number, date, amount, file name). These become the runbook's inputs.
- **Constants** — fixed elements (URLs, templates, field names, API endpoints, app sequences). These get hardcoded.

For each step, also consider error points:

- What can go wrong (page not loading, data missing, API error, wrong format)
- How the user currently handles failures (from evidence)
- What a reasonable fallback would be in an automated version

### Step 4 — Generate the Runbook

Using the evidence gathered, produce the runbook following the Output Template below. Ensure:

- Every step from trigger to completion is documented
- Variables (what changes between runs) and constants (what stays the same) are clearly separated
- The automation approach section gives a concrete implementation path
- Error handling covers realistic failure modes seen in the evidence

### Step 5 — Ask Where to Save

Ask the user where to save the runbook file. Suggest a default:

```
~/Desktop/runbooks/[pattern-name-slug].md
```

Where `[pattern-name-slug]` is the pattern name lowercased with spaces replaced by hyphens (e.g., "Client Onboarding" → `client-onboarding.md`).

### Step 6 — Write and Present

Save the runbook to the user's chosen path. Create the directory if it doesn't exist.

After saving, show:

- The file path where the runbook was saved
- A brief summary of what the runbook covers (pattern name, number of steps, key apps)
- Suggested next steps: review the runbook, start building the automation, or run `/pattern-to-runbook` again for another pattern

## Output Template

```markdown
# [Pattern Name] — Automation Runbook

## Overview

- **What this does**: [1-2 sentence description of the end-to-end process]
- **Trigger**: [what starts it — time-based, event-based, or manual]
- **Frequency**: [how often it occurs, based on activity evidence]
- **Estimated time per run**: [based on activity timestamps]
- **Estimated time saved per week**: [frequency × time per run]

## Prerequisites

- **Apps/services**: [list each app or service with what it's used for]
- **Access needed**: [credentials, API keys, permissions — don't include actual secrets]
- **Input data**: [what data sources feed into this process]

## Steps

### 1. [Action verb] — [what happens] in [app]

- **Details**: [exactly what to do]
- **Input**: [what data goes in]
- **Output**: [what to expect / what gets produced]
- **Error handling**: [what can go wrong and what to do]

### 2. [Action verb] — [what happens] in [app]

- **Details**: ...
- **Input**: ...
- **Output**: ...
- **Error handling**: ...

[Continue for all steps]

## What Varies Between Runs

- [Parameter 1]: [description and example values from evidence]
- [Parameter 2]: ...

These are the inputs/arguments for any automation built from this runbook.

## What Stays Constant

- [Constant 1]: [value or description]
- [Constant 2]: ...

These get hardcoded in the automation.

## Error Handling

- **[Failure mode 1]**: [how to detect] → [what to do]
- **[Failure mode 2]**: [how to detect] → [what to do]

## Automation Approach

- **Recommended method**: [API script / browser automation / CLI tool / scheduled job / etc.]
- **Key APIs or services**: [specific APIs, webhooks, or integrations to use]
- **Implementation sketch**:
```

[Pseudocode or high-level steps for the automation]

```
- **Effort estimate**: [easy / medium / hard] — [brief justification]
```

## Quality Checks

Before finalizing the runbook, verify:

1. **Completeness** — every step from trigger to completion is covered
2. **Specificity** — steps reference concrete apps, URLs, fields — not vague actions
3. **Reproducibility** — someone unfamiliar with the process could follow it
4. **Variables identified** — all changing parameters are listed, with examples
5. **Automation path clear** — the approach section gives enough detail to start building

## Notes

- **Privacy** — OCR data from `get_activity_details` may contain sensitive information. Extract only the process-relevant details (app names, field labels, URLs). Never include passwords, API keys, or personal messages in the runbook.
- **Incomplete evidence** — if activity data doesn't cover the full process, note the gaps in the runbook and suggest what the user should verify manually.
