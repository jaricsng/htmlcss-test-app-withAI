import { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { SCHEMA_SQL } from './sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Thin wrapper returned by {@link createDbWrapper}. Exposes typed prepare/exec/transaction helpers. */
export type DbWrapper = ReturnType<typeof createDbWrapper>;

/**
 * Opens (or creates) a SQLite database at `dbPath` and applies the application schema.
 * Configures WAL journal mode, a 5-second busy timeout to handle concurrent writes,
 * and enforces foreign-key constraints.
 *
 * Pass `":memory:"` for an in-process test database with no file on disk.
 *
 * @param dbPath - Absolute path to the SQLite file, or `":memory:"`.
 * @returns A wrapper exposing `prepare`, `exec`, and `transaction` with coerced parameter types.
 */
export function createDbWrapper(dbPath: string) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const raw = new DatabaseSync(dbPath);
  raw.exec('PRAGMA journal_mode = WAL');
  raw.exec('PRAGMA busy_timeout = 5000');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(SCHEMA_SQL);

  function coerce(params: unknown[]): SQLInputValue[] {
    return params.map(p => (p === undefined ? null : p)) as SQLInputValue[];
  }

  return {
    prepare(sql: string) {
      const stmt = raw.prepare(sql);
      return {
        get: (...params: unknown[]) => stmt.get(...coerce(params)) ?? null,
        all: (...params: unknown[]) => stmt.all(...coerce(params)),
        run: (...params: unknown[]) => stmt.run(...coerce(params)),
      };
    },
    exec(sql: string) {
      return raw.exec(sql);
    },
    transaction<T>(fn: (arg: T) => void) {
      return (arg: T) => {
        raw.exec('BEGIN');
        try {
          fn(arg);
          raw.exec('COMMIT');
        } catch (e) {
          raw.exec('ROLLBACK');
          throw e;
        }
      };
    },
  };
}

const DEFAULT_DB_PATH = process.env.DB_PATH
  ?? path.join(__dirname, '../../../data/app.db');

export default createDbWrapper(DEFAULT_DB_PATH);
