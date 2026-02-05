# Migrate to electron-log

Replace scattered `console.log/error/warn` calls with `electron-log` for persistent logging in packaged builds.

**Log file locations after migration:**
- macOS: `~/Library/Logs/memorylane/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\memorylane\logs\main.log`
- Linux: `~/.config/memorylane/logs/main.log`

---

## Ticket 1: Install and Configure electron-log

**Files:** `package.json`, `src/main/logger.ts` (new)

1. Install the package:
   ```bash
   npm install electron-log
   ```

2. Create `src/main/logger.ts`:
   ```typescript
   import log from 'electron-log/main';

   log.transports.file.level = 'info';
   log.transports.console.level = 'info';
   log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';

   // MCP mode: redirect console transport to stderr (MCP uses stdout for JSON-RPC)
   export function configureMCPMode(): void {
     log.transports.console.writeFn = ({ message }) => {
       process.stderr.write(message + '\n');
     };
   }

   export default log;
   ```

---

## Ticket 2: Update Main Entry Point

**File:** `src/main/index.ts`

1. Import logger at top (after MCP mode detection)
2. Call `configureMCPMode()` when in MCP mode
3. Replace all `console.log` → `log.info`, `console.error` → `log.error`
4. Remove the manual stderr redirect hack (lines 14-21)

**Log calls to migrate:** ~15

---

## Ticket 3: Update Recorder Module

**Files:**
- `src/main/recorder/recorder.ts` (~10 log calls)
- `src/main/recorder/interaction-monitor.ts` (~20 log calls)
- `src/main/recorder/visual-detector.ts` (~12 log calls)

For each file:
1. Add `import log from '../logger';`
2. Replace `console.log` → `log.info`
3. Replace `console.error` → `log.error`
4. Replace `.catch(console.error)` → `.catch(log.error)`

---

## Ticket 4: Update Processor Module

**Files:**
- `src/main/processor/index.ts` (~12 log calls)
- `src/main/processor/storage.ts` (~6 log calls)
- `src/main/processor/embedding.ts` (~2 log calls)
- `src/main/processor/semantic-classifier.ts` (~10 log calls)

For each file:
1. Add `import log from '../logger';`
2. Replace `console.log` → `log.info`
3. Replace `console.error` → `log.error`
4. Replace `console.warn` → `log.warn`

---

## Ticket 5: Update Settings Module

**Files:**
- `src/main/settings/settings-window.ts` (~6 log calls)
- `src/main/settings/api-key-manager.ts` (~4 log calls)
- `src/main/settings/capture-settings-manager.ts` (~3 log calls)

For each file:
1. Add `import log from '../logger';`
2. Replace all console calls with log equivalents

---

## Ticket 6: Update MCP Server

**File:** `src/main/mcp/server.ts` (~6 log calls)

1. Add `import log from '../logger';`
2. Replace `console.error` → `log.error` (this file uses stderr intentionally)

---

## Ticket 7: Test and Verify

1. Run in dev mode: `npm run dev`
2. Verify console output still works
3. Build and run packaged app
4. Check log file is created at expected location
5. Test MCP mode still works (stdout not polluted)

---

## Out of Scope

These files should **not** be migrated (they run outside Electron):
- `scripts/db-search.ts`
- `scripts/db-stats.ts`
- `scripts/mcp-server.ts`
- `src/preload/index.ts` (isolated context)
- `src/renderer/index.ts` (minimal logging)
