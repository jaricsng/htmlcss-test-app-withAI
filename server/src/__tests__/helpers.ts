import { createDbWrapper } from '../db/schema.js';
import { createApp } from '../app.js';
import { signToken } from '../middleware/auth.js';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';

/** Creates a fresh in-memory DB + Express app for one test suite. */
export function createTestApp() {
  const db = createDbWrapper(':memory:');
  const app = createApp(db);
  const request = supertest(app);
  return { db, app, request };
}

/** Seeds a user and returns their JWT. */
export async function seedUser(
  db: ReturnType<typeof createDbWrapper>,
  opts: { email: string; name: string; role: 'lecturer' | 'student' }
) {
  const hash = await bcrypt.hash('password123', 4); // low rounds = fast in tests
  const result = db.prepare(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(opts.email, opts.name, hash, opts.role);
  const userId = result.lastInsertRowid as number;
  const token = signToken({ userId, role: opts.role, name: opts.name });
  return { userId, token };
}

/** Auth header shorthand. */
export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
