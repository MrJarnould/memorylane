# SQLite Migration Plan

Replace LanceDB with SQLite (`better-sqlite3`) + `sqlite-vec` for the storage layer.

Old data will be deleted, not migrated.

---

## Ticket 1: Spike — validate `sqlite-vec` in Electron

**Goal:** Confirm that `better-sqlite3` + `sqlite-vec` load and work correctly inside a
packaged Electron app (dev mode and production build).

**Tasks:**

- Install `better-sqlite3`, `@types/better-sqlite3` (dev), and `sqlite-vec`
- Write a throwaway script (`scripts/sqlite-spike.ts`) that:
  - Opens a DB, loads the `sqlite-vec` extension
  - Creates a table with a vector column
  - Inserts a row, runs a vector search query
- Run it with `tsx` (standalone Node)
- Run it inside `npm run dev` (Electron dev mode)
- Run it inside a packaged app (`npm run package`) — verify the extension `.dylib`/`.so`/`.dll` is
  found at runtime
- Document any packaging config needed (ASAR unpack globs, extra resources, etc.)

**Output:** A short write-up of what works, what config is needed, and whether `sqlite-vec` is
viable or if brute-force vector search in JS is the fallback.

**If `sqlite-vec` doesn't work in Electron:** The fallback is storing vectors as BLOBs and doing
cosine similarity in JS. At our scale (< 100k rows), a full table scan with JS cosine similarity
takes < 50ms. The rest of the migration plan stays the same — only the vector search implementation
inside `StorageService` changes.

---

## Ticket 2: Rewrite `StorageService` with SQLite

**Goal:** Replace the LanceDB implementation in `src/main/processor/storage.ts` with
`better-sqlite3` + `sqlite-vec`, keeping the public API identical.

**Files changed:**

- `src/main/processor/storage.ts` (full rewrite of internals, ~250 lines)

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS context_events (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  appName TEXT NOT NULL DEFAULT '',
  vector BLOB  -- float32 array stored as raw bytes (or sqlite-vec virtual table)
);

CREATE INDEX IF NOT EXISTS idx_context_events_timestamp ON context_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_context_events_appName ON context_events(appName);
```

FTS:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS context_events_fts USING fts5(
  text,
  summary,
  content='context_events',
  content_rowid='rowid'
);
```

Vector search (sqlite-vec):

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS context_events_vec USING vec0(
  id TEXT PRIMARY KEY,
  embedding float[384]
);
```

**Method mapping (public API stays the same):**

| Method                      | Implementation change                                                     |
| --------------------------- | ------------------------------------------------------------------------- |
| `init()`                    | `new Database(path)`, run `CREATE TABLE/INDEX` statements                 |
| `addEvent(event)`           | `INSERT INTO` main table + FTS triggers + vec table                       |
| `getEventById(id)`          | `SELECT ... WHERE id = ?`                                                 |
| `searchFTS(query, limit)`   | `SELECT ... FROM context_events_fts WHERE ... MATCH ?`                    |
| `searchVectors(vec, limit)` | `SELECT ... FROM context_events_vec WHERE embedding MATCH ?`              |
| `searchVectorsWithFilters`  | Vector search + JOIN with main table for WHERE filters                    |
| `searchFTSWithFilters`      | Single FTS5 query across text+summary — replaces the two-query merge hack |
| `getEventsByTimeRange`      | `SELECT ... WHERE timestamp BETWEEN ? AND ?`                              |
| `countRows()`               | `SELECT COUNT(*) FROM context_events`                                     |
| `getDateRange()`            | `SELECT MIN(timestamp), MAX(timestamp) FROM context_events`               |
| `getDbSize()`               | `fs.statSync(dbFilePath).size`                                            |
| `close()`                   | `db.close()`                                                              |

**Notes:**

- `StoredEvent` interface does not change
- `normalizeVector()` goes away (SQLite returns predictable types)
- `buildWhereClause()` is replaced by parameterized queries (no more SQL string concatenation)
- `better-sqlite3` is synchronous — methods can drop `async` internally but should keep `async`
  signatures for API compatibility (return `Promise.resolve(...)`) or the callers can be updated
  to sync in a follow-up

---

## Ticket 3: Update tests

**Goal:** Make `storage.test.ts` pass against the new SQLite implementation.

**Files changed:**

- `src/main/processor/storage.test.ts` (~50 lines of changes)

**What changes:**

- Test DB path changes from a directory (`temp_test_lancedb/`) to a file (`temp_test.db`)
- Cleanup logic changes from recursive directory delete to `fs.unlinkSync` on the `.db` file
- All test assertions should pass as-is since the public API is identical
- Remove any LanceDB-specific workarounds if present

**What stays the same:**

- All test cases and their assertions
- The `createEvent` helper
- The `StoredEvent` shape

---

## Ticket 4: Update build and dependency config

**Goal:** Remove LanceDB dependencies, add SQLite dependencies, update all build config files.

**Files changed:**

- `package.json` — remove `@lancedb/lancedb` and `apache-arrow` from dependencies, add
  `better-sqlite3` and `sqlite-vec` to dependencies, add `@types/better-sqlite3` to devDependencies
- `electron.vite.config.ts` — replace `'@lancedb/lancedb'` with `'better-sqlite3'` in the
  `external` array. Add `'sqlite-vec'` if it's a native module that needs externalizing
- `electron-builder.yml` — replace `'node_modules/@lancedb/**/*'` ASAR unpack glob with
  `'node_modules/better-sqlite3/**/*'` (and `'node_modules/sqlite-vec/**/*'` if applicable)
- `vitest.config.ts` — replace `'@lancedb/lancedb'` with `'better-sqlite3'` in the
  `server.deps.external` array

**Notes:**

- `postinstall` script (`electron-builder install-app-deps`) already handles native module rebuilds,
  so `better-sqlite3` will be rebuilt for Electron automatically
- Verify `npm run dev`, `npm run build`, `npm run package` all still work after changes

---

## Ticket 5: Update `paths.ts` and cleanup on upgrade

**Goal:** Update the default database path and optionally clean up the old LanceDB directory.

**Files changed:**

- `src/main/paths.ts` — rename `lancedb` / `lancedb-dev` to `sqlite` / `sqlite-dev` (or
  `memorylane.db` / `memorylane-dev.db`). Since the DB is now a single file instead of a directory,
  the path should point to a file not a directory.
- `src/main/index.ts` (optional) — on startup, detect and delete old `lancedb`/`lancedb-dev`
  directories to free disk space. Log a message when this happens. This is a nice-to-have; can be
  skipped and done manually.

---

## Ticket 6: Update CLI scripts

**Goal:** Make `db-search` and `db-stats` scripts work with the new SQLite backend.

**Files changed:**

- `scripts/db-search.ts` — update help text (references to "LanceDB directory" become "SQLite
  database"). The actual `StorageService` calls are unchanged.
- `scripts/db-stats.ts` — same help text updates. The `getDirectorySize` helper can be simplified
  to `fs.statSync(dbPath).size` since it's a single file now.

**Notes:**

- Both scripts use `StorageService` through its public API, so the logic doesn't change — only
  cosmetic text and the size calculation.

---

## Ticket 7: Update documentation

**Goal:** Update all docs that reference LanceDB.

**Files changed:**

- `CLAUDE.md` — update architecture section, native modules list, storage description
- `src/main/processor/SPEC.md` — update storage references
- `AGENTS.md` — no changes expected (doesn't reference the DB directly)

---

## Order of execution

```
1. Spike (sqlite-vec in Electron)    — blocks everything; do this first
   │
   ├─ if sqlite-vec works ──────────────────────────────┐
   │                                                     │
   └─ if not, decide on brute-force fallback ───────────┤
                                                         │
2. Rewrite StorageService ◄──────────────────────────────┘
   │
3. Update tests                      — can start in parallel with 2 if interface is agreed
   │
4. Update build & dependency config  — after 2, so you can verify the build
   │
5. Update paths.ts + old data cleanup
   │
6. Update CLI scripts
   │
7. Update documentation              — last, once everything is settled
```

Tickets 2+3 are the bulk of the work. Everything else is small config/text changes.
