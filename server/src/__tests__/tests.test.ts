import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, seedUser, bearer } from './helpers.js';

describe('Tests API', () => {
  const { db, request } = createTestApp();
  let lecturerToken: string;
  let studentToken: string;
  let lecturerId: number;

  beforeEach(async () => {
    db.exec(
      'DELETE FROM submissions; DELETE FROM attempts; DELETE FROM criteria; DELETE FROM questions; DELETE FROM tests; DELETE FROM users;'
    );
    const lec = await seedUser(db, { email: 'lec@test.com', name: 'Dr Smith', role: 'lecturer' });
    const stu = await seedUser(db, { email: 'stu@test.com', name: 'Alice', role: 'student' });
    lecturerToken = lec.token;
    studentToken = stu.token;
    lecturerId = lec.userId;
  });

  // ── Create ────────────────────────────────────────────────────────────────

  describe('POST /api/tests', () => {
    it('creates a draft test', async () => {
      const res = await request
        .post('/api/tests')
        .set(bearer(lecturerToken))
        .send({ title: 'HTML Quiz', description: 'Basics', time_limit_minutes: 30 });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeTruthy();
    });

    it('requires a title', async () => {
      const res = await request.post('/api/tests').set(bearer(lecturerToken)).send({});
      expect(res.status).toBe(400);
    });

    it('rejects student trying to create a test', async () => {
      const res = await request
        .post('/api/tests')
        .set(bearer(studentToken))
        .send({ title: 'Quiz' });
      expect(res.status).toBe(403);
    });
  });

  // ── List ──────────────────────────────────────────────────────────────────

  describe('GET /api/tests/my', () => {
    it("returns only the lecturer's own tests", async () => {
      await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Quiz 1' });
      await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Quiz 2' });
      const res = await request.get('/api/tests/my').set(bearer(lecturerToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((t: any) => t.lecturer_id === lecturerId)).toBe(true);
    });

    it('rejects students with 403', async () => {
      const res = await request.get('/api/tests/my').set(bearer(studentToken));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tests/available', () => {
    it('only returns published tests', async () => {
      await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Draft Quiz' }); // left unpublished
      const {
        body: { id: pubId },
      } = await request
        .post('/api/tests')
        .set(bearer(lecturerToken))
        .send({ title: 'Published Quiz' });

      // Publish using the captured id — AUTOINCREMENT means we can't assume id=2
      await request
        .put(`/api/tests/${pubId}`)
        .set(bearer(lecturerToken))
        .send({ status: 'published' });

      const res = await request.get('/api/tests/available').set(bearer(studentToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Published Quiz');
    });

    it('includes attempt_status for the requesting student', async () => {
      const {
        body: { id: testId },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Q' });
      await request
        .put(`/api/tests/${testId}`)
        .set(bearer(lecturerToken))
        .send({ status: 'published' });
      await request.post('/api/attempts/start').set(bearer(studentToken)).send({ test_id: testId });

      const res = await request.get('/api/tests/available').set(bearer(studentToken));
      expect(res.body[0].attempt_status).toBe('in_progress');
    });
  });

  // ── Read single ───────────────────────────────────────────────────────────

  describe('GET /api/tests/:id', () => {
    it('returns test with questions and criteria for lecturer', async () => {
      const {
        body: { id },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Quiz' });
      await request
        .post('/api/questions')
        .set(bearer(lecturerToken))
        .send({
          test_id: id,
          type: 'mcq',
          order_index: 0,
          title: 'Q1',
          description: 'Desc',
          total_points: 5,
        });

      const res = await request.get(`/api/tests/${id}`).set(bearer(lecturerToken));
      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].criteria).toBeDefined();
    });

    it('returns 404 for non-existent test', async () => {
      const res = await request.get('/api/tests/99999').set(bearer(lecturerToken));
      expect(res.status).toBe(404);
    });

    it('prevents student seeing a draft test', async () => {
      const {
        body: { id },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Draft' });
      const res = await request.get(`/api/tests/${id}`).set(bearer(studentToken));
      expect(res.status).toBe(403);
    });
  });

  // ── Update ────────────────────────────────────────────────────────────────

  describe('PUT /api/tests/:id', () => {
    it('updates title and status', async () => {
      const {
        body: { id },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Old Title' });
      const res = await request
        .put(`/api/tests/${id}`)
        .set(bearer(lecturerToken))
        .send({ title: 'New Title', status: 'published' });
      expect(res.status).toBe(200);

      const { body } = await request.get(`/api/tests/${id}`).set(bearer(lecturerToken));
      expect(body.title).toBe('New Title');
      expect(body.status).toBe('published');
    });

    it("prevents editing another lecturer's test", async () => {
      const {
        body: { id },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Mine' });

      const other = await seedUser(db, {
        email: 'other@test.com',
        name: 'Other',
        role: 'lecturer',
      });
      const res = await request
        .put(`/api/tests/${id}`)
        .set(bearer(other.token))
        .send({ title: 'Stolen' });
      expect(res.status).toBe(404);
    });
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  describe('DELETE /api/tests/:id', () => {
    it('deletes the test and its questions', async () => {
      const {
        body: { id },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'To Delete' });
      await request.delete(`/api/tests/${id}`).set(bearer(lecturerToken));
      const res = await request.get(`/api/tests/${id}`).set(bearer(lecturerToken));
      expect(res.status).toBe(404);
    });
  });
});
