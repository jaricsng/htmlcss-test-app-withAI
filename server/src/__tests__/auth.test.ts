import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, seedUser, bearer } from './helpers.js';

describe('POST /api/auth/register', () => {
  const { request } = createTestApp();

  it('registers a new lecturer and returns a token', async () => {
    const res = await request.post('/api/auth/register').send({
      email: 'lecturer@test.com', name: 'Dr Smith',
      password: 'pass123', role: 'lecturer',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('lecturer');
    expect(res.body.user.email).toBe('lecturer@test.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('registers a new student and returns a token', async () => {
    const res = await request.post('/api/auth/register').send({
      email: 'student@test.com', name: 'Alice',
      password: 'pass123', role: 'student',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('student');
  });

  it('rejects duplicate email with 409', async () => {
    await request.post('/api/auth/register').send({
      email: 'dup@test.com', name: 'A', password: 'p', role: 'student',
    });
    const res = await request.post('/api/auth/register').send({
      email: 'dup@test.com', name: 'B', password: 'p', role: 'student',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('rejects invalid role with 400', async () => {
    const res = await request.post('/api/auth/register').send({
      email: 'x@test.com', name: 'X', password: 'p', role: 'admin',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request.post('/api/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  // Fresh isolated app — beforeAll seeds once, tests only read so no conflicts
  const { db, request } = createTestApp();

  beforeAll(async () => {
    await seedUser(db, { email: 'user@test.com', name: 'User', role: 'student' });
  });

  it('returns a token for valid credentials', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'user@test.com', password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('user@test.com');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'user@test.com', password: 'wrongpass',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('Auth middleware', () => {
  const { request } = createTestApp();

  it('rejects requests with no token with 401', async () => {
    const res = await request.get('/api/tests/my');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a malformed token with 401', async () => {
    const res = await request.get('/api/tests/my').set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});
