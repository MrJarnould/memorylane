import Database from 'better-sqlite3'
import type { Migration } from '../migrator'

export const migration: Migration = {
  name: '0006_pattern_approved_at_column',
  up(db: Database.Database): void {
    db.exec(`ALTER TABLE patterns ADD COLUMN approved_at INTEGER`)
  },
}
