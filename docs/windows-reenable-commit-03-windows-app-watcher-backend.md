# Commit 03 Spec: Windows App/Window Watcher Backend

## Goal

Add a `win32` app/window watcher backend and wire it through `app-watcher.ts` so Windows emits real `app_change` context (app, window title, timestamp, and display routing inputs).

## Dependencies and Boundaries

- Depends on `commit-02` (Windows screenshot backend).
- This commit focuses on watcher data flow and display routing compatibility.
- Do not include startup degraded-mode UX and preflight checks (that is `commit-04`).

## Cross-Commit Compatibility Requirement

`commit-02` and `commit-03` must share one display identity contract:

- Canonical display identifier in pipeline events is Electron `Display.id` (`number`).
- `ScreenCapturer` receives this via `setDisplayId(...)`.
- Windows screenshot backend matches this against `DesktopCapturerSource.display_id`.

If watcher emits a different monitor ID namespace, routing is incorrect even if capture still runs.

## Technical Choice

Implement Windows watcher as a PowerShell sidecar process for this commit.

Rationale:

- No new native build toolchain in this commit.
- Matches existing Windows OCR sidecar approach (`powershell.exe` execution model).
- Sufficient for event stream needed by `interaction-monitor`.

## Event Payload Contract (Windows Watcher)

Emit JSON lines with:

- `type`: `ready` | `app_change` | `window_change` | `error`
- `timestamp`: Unix ms
- `app`: process/app name
- `pid`: process ID
- `title`: focused window title
- `windowBounds`: `{ x, y, width, height }` in **screen physical pixels**
- optional `error`

`displayId` may be omitted by watcher; JS layer resolves canonical ID.

## Display ID Resolution Spec (in Interaction Monitor)

Update display resolution order in `interaction-monitor.ts`:

1. If event has `displayId`, use it.
2. Else if event has `windowBounds`, convert bounds to DIP using `screen.screenToDipRect(null, rect)` on Windows, then resolve display with `screen.getDisplayMatching(...)`.
3. Else fallback to cursor-based display (`screen.getCursorScreenPoint()` + `getDisplayNearestPoint`).

This keeps `displayId` compatible with screenshot backend selection and avoids mixed-DPI mismatches.

## File-Level Plan

1. Add Windows backend wrapper:
   - `src/main/recorder/app-watcher-win.ts` (new)
   - Spawn/monitor PowerShell watcher process and forward parsed events.
   - Implement retry/backoff behavior consistent with mac backend expectations.

2. Add PowerShell watcher script:
   - `src/main/recorder/powershell/app-watcher-windows.ps1` (new)
   - Poll focused window state on a short interval.
   - Emit `ready` once, then emit `app_change`/`window_change` only on change.

3. Wire backend selector:
   - `src/main/recorder/app-watcher.ts`
   - Register `win32` in `PLATFORM_APP_WATCHER_BACKENDS`.

4. Update display resolution logic:
   - `src/main/recorder/interaction-monitor.ts`
   - Prefer `windowBounds`-based display mapping before cursor fallback.

## Validation and Logging Requirements

- Log watcher start/stop/restart and parse failures with backend prefix.
- On watcher failure, continue interaction monitoring and capture (context degraded, no crash).
- Log when falling back from `windowBounds` to cursor-based display resolution.

## Tests in Scope

Add focused unit tests for:

- `app-watcher.ts` backend selection on `win32`
- Windows watcher line parsing and event forwarding in `app-watcher-win.ts`
- `interaction-monitor` display resolution priority (`displayId` > `windowBounds` > cursor)

Add Windows integration test with persisted outputs:

- `src/main/recorder/app-watcher.windows.integration.test.ts` (new)
- Gate with:
  - `process.platform === 'win32'`
  - `RUN_WINDOWS_INTEGRATION=1`
- Persist artifacts in:
  - `.debug-app-watcher-win/<timestamp>/`
- Required artifacts:
  - `watcher-events.jsonl` (raw backend events)
  - `interaction-events.jsonl` (post-`interaction-monitor` events with resolved `displayId`)
  - `summary.json` (counts, first/last timestamps, fallback path usage)

## Verification Criteria

- All unit tests in this commit pass.
- Windows integration test passes when enabled.
- Integration artifacts are written and inspectable by humans/agents.

## Acceptance Criteria

- On Windows, app/window changes emit non-empty app/title context through existing interaction pipeline.
- Event-derived `displayId` is in Electron `Display.id` space and works with commit-02 screenshot routing.
- Capture continues if watcher is unavailable (with clear warning logs).
- Unit + Windows integration tests for this commit pass.
