import express from 'express';
import cors from 'cors';
import type { DbWrapper } from './db/schema.js';

import { makeAuthRouter } from './routes/auth.js';
import { makeTestsRouter } from './routes/tests.js';
import { makeQuestionsRouter } from './routes/questions.js';
import { makeAttemptsRouter } from './routes/attempts.js';

/**
 * Creates and configures the Express application.
 *
 * Accepts a {@link DbWrapper} rather than importing the singleton directly so
 * integration tests can inject an in-memory database without touching the filesystem.
 *
 * Registered routes:
 * - `POST /api/auth/register` — create account
 * - `POST /api/auth/login`    — authenticate
 * - `/api/tests/*`            — test CRUD (lecturer) and discovery (student)
 * - `/api/questions/*`        — question and criteria management
 * - `/api/attempts/*`         — attempt lifecycle and grading
 * - `GET  /api/health`        — liveness probe
 *
 * @param db - Database wrapper to inject into all route factories.
 * @returns Configured Express application, ready to `.listen()`.
 */
export function createApp(db: DbWrapper) {
  const app = express();
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/auth', makeAuthRouter(db));
  app.use('/api/tests', makeTestsRouter(db));
  app.use('/api/questions', makeQuestionsRouter(db));
  app.use('/api/attempts', makeAttemptsRouter(db));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  return app;
}
