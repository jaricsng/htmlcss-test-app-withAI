import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, seedUser, bearer } from './helpers.js';

/**
 * Seeds a full published test with one code question (2 DOM criteria)
 * and one MCQ question. Returns captured IDs — never assumes AUTOINCREMENT values.
 */
async function seedPublishedTest(
  request: ReturnType<typeof createTestApp>['request'],
  lecturerToken: string
) {
  const {
    body: { id: testId },
  } = await request
    .post('/api/tests')
    .set(bearer(lecturerToken))
    .send({ title: 'HTML Quiz', time_limit_minutes: 30 });

  const {
    body: { id: codeQId },
  } = await request.post('/api/questions').set(bearer(lecturerToken)).send({
    test_id: testId,
    type: 'code-from-scratch',
    order_index: 0,
    title: 'Build a nav',
    description: 'desc',
    total_points: 10,
  });

  await request
    .post(`/api/questions/${codeQId}/criteria`)
    .set(bearer(lecturerToken))
    .send({ type: 'dom', label: 'Has nav.navbar', selector: 'nav.navbar', points: 5 });
  await request
    .post(`/api/questions/${codeQId}/criteria`)
    .set(bearer(lecturerToken))
    .send({ type: 'dom', label: 'Has a link', selector: 'nav a', points: 5 });

  const {
    body: { id: mcqQId },
  } = await request
    .post('/api/questions')
    .set(bearer(lecturerToken))
    .send({
      test_id: testId,
      type: 'mcq',
      order_index: 1,
      title: 'CSS meaning',
      description: 'desc',
      total_points: 5,
      mcq_options: ['Cascading Style Sheets', 'Creative Style', 'Computer Style', 'Cool Style'],
      mcq_correct_index: 0,
    });

  // Use the captured testId — not a hardcoded integer
  await request
    .put(`/api/tests/${testId}`)
    .set(bearer(lecturerToken))
    .send({ status: 'published' });

  return { testId, codeQId, mcqQId };
}

describe('Attempts & grading API', () => {
  const { db, request } = createTestApp();
  let lecturerToken: string;
  let studentToken: string;
  let studentId: number;

  beforeEach(async () => {
    db.exec(
      'DELETE FROM submissions; DELETE FROM attempts; DELETE FROM criteria; DELETE FROM questions; DELETE FROM tests; DELETE FROM users;'
    );
    const lec = await seedUser(db, { email: 'lec@test.com', name: 'Dr Smith', role: 'lecturer' });
    const stu = await seedUser(db, { email: 'stu@test.com', name: 'Alice', role: 'student' });
    lecturerToken = lec.token;
    studentToken = stu.token;
    studentId = stu.userId;
  });

  // ── Start attempt ─────────────────────────────────────────────────────────

  describe('POST /api/attempts/start', () => {
    it('creates a new attempt for a published test', async () => {
      const { testId } = await seedPublishedTest(request, lecturerToken);
      const res = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      expect(res.status).toBe(200);
      expect(res.body.attempt.status).toBe('in_progress');
      expect(res.body.attempt.student_id).toBe(studentId);
    });

    it('resumes an existing in-progress attempt (same attempt id returned)', async () => {
      const { testId } = await seedPublishedTest(request, lecturerToken);
      const first = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      const firstId = first.body.attempt.id;

      const second = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      expect(second.status).toBe(200);
      expect(second.body.attempt.id).toBe(firstId); // same attempt, not a duplicate
    });

    it('rejects start on a draft test with 404', async () => {
      const {
        body: { id: testId },
      } = await request.post('/api/tests').set(bearer(lecturerToken)).send({ title: 'Draft' });
      const res = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      expect(res.status).toBe(404);
    });
  });

  // ── Save progress ─────────────────────────────────────────────────────────

  describe('PUT /api/attempts/:id/questions/:qid', () => {
    it('saves HTML and CSS answers', async () => {
      const { testId, codeQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });

      const res = await request
        .put(`/api/attempts/${attempt.id}/questions/${codeQId}`)
        .set(bearer(studentToken))
        .send({
          html_code: '<nav class="navbar"><a>Home</a></nav>',
          css_code: 'nav { color: red; }',
        });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('saves MCQ answer index', async () => {
      const { testId, mcqQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });

      const res = await request
        .put(`/api/attempts/${attempt.id}/questions/${mcqQId}`)
        .set(bearer(studentToken))
        .send({ mcq_answer_index: 0 });
      expect(res.status).toBe(200);
    });

    it("rejects saves for another student's attempt", async () => {
      const { testId, codeQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });

      const other = await seedUser(db, { email: 'other@test.com', name: 'Bob', role: 'student' });
      const res = await request
        .put(`/api/attempts/${attempt.id}/questions/${codeQId}`)
        .set(bearer(other.token))
        .send({ html_code: '<p>hacked</p>' });
      expect(res.status).toBe(400);
    });
  });

  // ── Submit & auto-grade ───────────────────────────────────────────────────

  describe('POST /api/attempts/:id/submit', () => {
    it('grades a perfect submission — 15/15', async () => {
      const { testId, codeQId, mcqQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });

      await request
        .put(`/api/attempts/${attempt.id}/questions/${codeQId}`)
        .set(bearer(studentToken))
        .send({ html_code: '<nav class="navbar"><a href="#">Home</a></nav>', css_code: '' });
      await request
        .put(`/api/attempts/${attempt.id}/questions/${mcqQId}`)
        .set(bearer(studentToken))
        .send({ mcq_answer_index: 0 });

      const res = await request
        .post(`/api/attempts/${attempt.id}/submit`)
        .set(bearer(studentToken))
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(15);
      expect(res.body.maxScore).toBe(15);
    });

    it('grades a partial submission — 5/15', async () => {
      const { testId, codeQId, mcqQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });

      // nav exists but no link — 5/10 for code question
      await request
        .put(`/api/attempts/${attempt.id}/questions/${codeQId}`)
        .set(bearer(studentToken))
        .send({ html_code: '<nav class="navbar"></nav>', css_code: '' });
      // wrong MCQ answer — 0/5
      await request
        .put(`/api/attempts/${attempt.id}/questions/${mcqQId}`)
        .set(bearer(studentToken))
        .send({ mcq_answer_index: 2 });

      const res = await request
        .post(`/api/attempts/${attempt.id}/submit`)
        .set(bearer(studentToken))
        .send({});
      expect(res.body.score).toBe(5);
      expect(res.body.maxScore).toBe(15);
    });

    it('grades a blank submission — 0/15', async () => {
      const { testId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });

      const res = await request
        .post(`/api/attempts/${attempt.id}/submit`)
        .set(bearer(studentToken))
        .send({});
      expect(res.body.score).toBe(0);
      expect(res.body.maxScore).toBe(15);
    });

    it('rejects a second submission with 400', async () => {
      const { testId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      await request.post(`/api/attempts/${attempt.id}/submit`).set(bearer(studentToken)).send({});

      const res = await request
        .post(`/api/attempts/${attempt.id}/submit`)
        .set(bearer(studentToken))
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Results ───────────────────────────────────────────────────────────────

  describe('GET /api/attempts/:id/results', () => {
    it('returns per-criterion grading results', async () => {
      const { testId, codeQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      await request
        .put(`/api/attempts/${attempt.id}/questions/${codeQId}`)
        .set(bearer(studentToken))
        .send({ html_code: '<nav class="navbar"><a>Home</a></nav>', css_code: '' });
      await request.post(`/api/attempts/${attempt.id}/submit`).set(bearer(studentToken)).send({});

      const res = await request
        .get(`/api/attempts/${attempt.id}/results`)
        .set(bearer(studentToken));
      expect(res.status).toBe(200);
      expect(res.body.submissions[0].grading_results).toHaveLength(2);
      expect(res.body.submissions[0].grading_results[0].passed).toBe(true);
    });

    it("prevents a student from viewing another student's results", async () => {
      const { testId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      await request.post(`/api/attempts/${attempt.id}/submit`).set(bearer(studentToken)).send({});

      const other = await seedUser(db, { email: 'other2@test.com', name: 'Bob', role: 'student' });
      const res = await request.get(`/api/attempts/${attempt.id}/results`).set(bearer(other.token));
      expect(res.status).toBe(403);
    });
  });

  // ── Lecturer results view ─────────────────────────────────────────────────

  describe('GET /api/attempts/test/:testId/results', () => {
    it('returns all student attempts with total scores', async () => {
      const { testId, codeQId } = await seedPublishedTest(request, lecturerToken);
      const {
        body: { attempt },
      } = await request
        .post('/api/attempts/start')
        .set(bearer(studentToken))
        .send({ test_id: testId });
      await request
        .put(`/api/attempts/${attempt.id}/questions/${codeQId}`)
        .set(bearer(studentToken))
        .send({ html_code: '<nav class="navbar"><a>x</a></nav>', css_code: '' });
      await request.post(`/api/attempts/${attempt.id}/submit`).set(bearer(studentToken)).send({});

      const res = await request
        .get(`/api/attempts/test/${testId}/results`)
        .set(bearer(lecturerToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].student_name).toBe('Alice');
      expect(res.body[0].total_score).toBe(10); // both dom criteria pass
    });
  });
});
