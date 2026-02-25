# Commit 02 Spec: Windows Screenshot Backend (v2)

## Goal

Implement a `win32` screenshot backend for v2 that matches the existing `captureDesktop()` contract:

- `filepath`
- `width`
- `height`
- `displayId`

This commit should make v2 screenshot capture work on Windows without depending on macOS Swift binaries.

## Dependencies and Boundaries

- Depends on `commit-01` capture backend abstraction.
- Do not include app watcher work (that is `commit-03`).
- Do not include startup preflight/degraded messaging (that is `commit-04`).

## Technical Choice

Use Electron `desktopCapturer` in main process for Windows capture.

Rationale:

- No new native build chain required.
- Works with existing v2 cadence (`1s`) and bounded image size.
- Native display IDs (`DesktopCapturerSource.display_id`) are directly compatible with Electron `Display.id`.

## Display ID Contract (Commit 02)

Canonical ID for v2 capture routing is **Electron `Display.id`** (`number`).

Windows screenshot backend rules:

1. If `options.displayId` is provided, select source where `source.display_id === String(options.displayId)`.
2. If no `displayId` is provided, use the first available screen source.
3. Return `displayId` as a `number` in `DesktopCaptureResult`.
4. If `displayId` was requested but no matching source exists, throw a clear error that includes requested and available IDs.

## File-Level Plan

1. Add Windows backend module:
   - `src/main/v2/recorder/native-screenshot-win.ts` (new)
   - Responsibilities:
     - call `desktopCapturer.getSources({ types: ['screen'], thumbnailSize })`
     - pick source using rules above
     - enforce `maxDimensionPx` validation
     - write PNG to `outputPath`
     - return shared `DesktopCaptureResult`

2. Wire backend selector:
   - `src/main/v2/recorder/native-screenshot.ts`
   - Add `win32` mapping in `PLATFORM_CAPTURE_BACKENDS`.
   - Keep unsupported-platform error path for non-implemented platforms.

3. Keep shared contract unchanged:
   - `src/main/v2/recorder/native-screenshot-backend.ts`
   - No interface shape changes in this commit.

## Sizing Semantics

- Input: `maxDimensionPx` is optional and must be positive finite when provided.
- Output: resulting image must satisfy `max(width, height) <= maxDimensionPx` when requested.
- Because `thumbnailSize` can vary by platform scaling, backend should verify final dimensions and resize if needed before writing PNG.

## Tests in Scope

1. Update selector tests:
   - `src/main/v2/recorder/native-screenshot.test.ts`
   - Assert `resolveDesktopCaptureBackend('win32')` resolves.
   - Keep unsupported-platform assertion using `linux`.

2. Add Windows backend unit tests:
   - `src/main/v2/recorder/native-screenshot-win.test.ts` (new)
   - Mock `desktopCapturer` and `NativeImage`.
   - Cover:
     - explicit display selection
     - default source fallback when display not specified
     - missing sources error
     - requested display not found error
     - invalid `maxDimensionPx` validation
     - output contract shape and PNG write

3. Add Windows integration test with persisted outputs:
   - `src/main/v2/recorder/native-screenshot.windows.integration.test.ts` (new)
   - Gate with:
     - `process.platform === 'win32'`
     - `RUN_WINDOWS_INTEGRATION=1`
   - Persist artifacts in:
     - `.debug-native-screenshot-win/<timestamp>/`
   - Required artifacts:
     - `desktop.png` (default capture)
     - `explicit-display.png` (capture with requested `displayId`)
     - `capture-results.json` (filepath/width/height/displayId for each case)

## Verification Criteria

- All unit tests in this commit pass.
- Windows integration test passes when enabled.
- Integration artifacts are written and inspectable by humans/agents.

## Acceptance Criteria

- `captureDesktop()` works on `win32` and writes a PNG.
- Returned `displayId` is numeric and usable by downstream v2 code.
- Existing call sites (`ScreenCapturer`, pipeline harness) require no contract changes.
- Unit + Windows integration tests for this commit pass.
