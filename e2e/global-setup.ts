import { rm } from 'fs/promises';
import path from 'path';

export default async function globalSetup() {
  const dbPath = path.join(__dirname, 'test.db');
  await rm(dbPath, { force: true });
  await rm(dbPath + '-wal', { force: true });
  await rm(dbPath + '-shm', { force: true });
}
