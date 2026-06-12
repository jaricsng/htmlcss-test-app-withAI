import { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/app.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('lecturer', 'student')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lecturer_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    published_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('code-from-scratch', 'fix-the-bug', 'match-output', 'mcq')),
    order_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    starter_html TEXT DEFAULT '',
    starter_css TEXT DEFAULT '',
    reference_html TEXT DEFAULT '',
    reference_css TEXT DEFAULT '',
    reference_screenshot TEXT,
    mcq_options TEXT,
    mcq_correct_index INTEGER,
    total_points INTEGER NOT NULL DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('dom', 'style', 'mcq')),
    label TEXT NOT NULL,
    selector TEXT,
    attribute TEXT,
    expected_value TEXT,
    css_property TEXT,
    points INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id),
    student_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted')),
    started_at INTEGER NOT NULL DEFAULT (unixepoch()),
    submitted_at INTEGER,
    UNIQUE(test_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL REFERENCES attempts(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    html_code TEXT DEFAULT '',
    css_code TEXT DEFAULT '',
    mcq_answer_index INTEGER,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    grading_results TEXT,
    submitted_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(attempt_id, question_id)
  );
`);

// Thin wrapper to match better-sqlite3's API shape
export default {
  prepare(sql: string) {
    const stmt = db.prepare(sql);
    return {
      get: (...params: unknown[]) => stmt.get(...(params as SQLInputValue[])) ?? null,
      all: (...params: unknown[]) => stmt.all(...(params as SQLInputValue[])),
      run: (...params: unknown[]) => stmt.run(...(params as SQLInputValue[])),
    };
  },
  exec(sql: string) {
    return db.exec(sql);
  },
  transaction<T>(fn: (arg: T) => void) {
    return (arg: T) => {
      db.exec('BEGIN');
      try {
        fn(arg);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    };
  },
};
