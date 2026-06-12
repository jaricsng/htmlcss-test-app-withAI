import { createApp } from './app.js';
import defaultDb from './db/schema.js';

/**
 * Server entry point.
 *
 * Wires the singleton database (path resolved from `DB_PATH` env var,
 * defaulting to `data/app.db` relative to the project root) into
 * {@link createApp} and starts listening.
 *
 * Port is read from the `PORT` environment variable (default `3001`).
 */
const PORT = process.env.PORT ?? 3001;
const app = createApp(defaultDb);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
