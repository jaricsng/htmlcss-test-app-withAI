import { Router } from 'express';
import type { DbWrapper } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { gradeSubmission, gradeMcq, Criterion } from '../services/grader.js';

/**
 * Builds the attempts router, which handles the full student test-taking lifecycle.
 *
 * Routes:
 * - `POST /start`                          — create or resume an attempt for a published test (student).
 * - `PUT  /:attemptId/questions/:questionId` — upsert an answer for one question (student).
 * - `POST /:attemptId/submit`              — finalise the attempt, grade all questions, lock for edits (student).
 * - `GET  /:attemptId/results`             — retrieve per-question grading breakdown (any role).
 * - `GET  /test/:testId/results`           — all attempts on a test with aggregated scores (lecturer).
 *
 * Grading at submit time:
 * - MCQ questions use {@link gradeMcq} (direct index comparison).
 * - Code questions with criteria use {@link gradeSubmission} (JSDOM + css-tree analysis).
 * - Unanswered questions are inserted with score 0 so the results set is always complete.
 *
 * Each question is graded inside a SQLite transaction to keep submissions and scores consistent.
 *
 * @param db - Injected database wrapper.
 */
export function makeAttemptsRouter(db: DbWrapper) {
  const router = Router();

  router.post('/start', requireAuth, requireRole('student'), (req, res) => {
    const { test_id } = req.body;
    const test = db
      .prepare("SELECT * FROM tests WHERE id = ? AND status = 'published'")
      .get(test_id) as any;
    if (!test) return res.status(404).json({ error: 'Test not available' });

    let attempt = db
      .prepare('SELECT * FROM attempts WHERE test_id = ? AND student_id = ?')
      .get(test_id, req.user!.userId) as any;

    if (!attempt) {
      const result = db
        .prepare('INSERT INTO attempts (test_id, student_id) VALUES (?, ?)')
        .run(test_id, req.user!.userId);
      attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(result.lastInsertRowid);
    }

    if (attempt.status === 'submitted') {
      return res.status(400).json({ error: 'Test already submitted' });
    }

    const submissions = db
      .prepare('SELECT * FROM submissions WHERE attempt_id = ?')
      .all(attempt.id);
    res.json({ attempt, submissions });
  });

  router.put(
    '/:attemptId/questions/:questionId',
    requireAuth,
    requireRole('student'),
    (req, res) => {
      const attempt = db
        .prepare('SELECT * FROM attempts WHERE id = ? AND student_id = ?')
        .get(req.params.attemptId, req.user!.userId) as any;

      if (!attempt || attempt.status === 'submitted') {
        return res.status(400).json({ error: 'Invalid attempt' });
      }

      const { html_code, css_code, mcq_answer_index } = req.body;
      db.prepare(
        `
      INSERT INTO submissions (attempt_id, question_id, html_code, css_code, mcq_answer_index)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        html_code = excluded.html_code,
        css_code = excluded.css_code,
        mcq_answer_index = excluded.mcq_answer_index
    `
      ).run(
        req.params.attemptId,
        req.params.questionId,
        html_code ?? '',
        css_code ?? '',
        mcq_answer_index ?? null
      );

      res.json({ ok: true });
    }
  );

  router.post('/:attemptId/submit', requireAuth, requireRole('student'), (req, res) => {
    const attempt = db
      .prepare('SELECT * FROM attempts WHERE id = ? AND student_id = ?')
      .get(req.params.attemptId, req.user!.userId) as any;

    if (!attempt || attempt.status === 'submitted') {
      return res.status(400).json({ error: 'Invalid attempt' });
    }

    const questions = db
      .prepare('SELECT * FROM questions WHERE test_id = ?')
      .all(attempt.test_id) as any[];

    const gradeQuestion = db.transaction((question: any) => {
      const submission = db
        .prepare('SELECT * FROM submissions WHERE attempt_id = ? AND question_id = ?')
        .get(attempt.id, question.id) as any;

      let score = 0;
      let maxScore = question.total_points;
      let gradingResults: any[] = [];

      if (!submission) {
        db.prepare(
          `
          INSERT INTO submissions (attempt_id, question_id, html_code, css_code, score, max_score, grading_results)
          VALUES (?, ?, '', '', 0, ?, ?)
        `
        ).run(attempt.id, question.id, maxScore, JSON.stringify([]));
        return;
      }

      if (question.type === 'mcq') {
        score = gradeMcq(submission.mcq_answer_index, question.mcq_correct_index, maxScore);
        gradingResults = [
          {
            label: 'Correct answer',
            passed: score > 0,
            earned: score,
            points: maxScore,
            feedback: score > 0 ? '✓ Correct' : '✗ Incorrect',
          },
        ];
      } else {
        const criteria = db
          .prepare('SELECT * FROM criteria WHERE question_id = ?')
          .all(question.id) as unknown as Criterion[];

        if (criteria.length > 0) {
          const grading = gradeSubmission(
            submission.html_code ?? '',
            submission.css_code ?? '',
            criteria
          );
          score = grading.score;
          maxScore = grading.maxScore;
          gradingResults = grading.results;
        }
      }

      db.prepare(
        `
        UPDATE submissions SET score = ?, max_score = ?, grading_results = ?
        WHERE attempt_id = ? AND question_id = ?
      `
      ).run(score, maxScore, JSON.stringify(gradingResults), attempt.id, question.id);
    });

    for (const question of questions) {
      gradeQuestion(question);
    }

    db.prepare(
      "UPDATE attempts SET status = 'submitted', submitted_at = unixepoch() WHERE id = ?"
    ).run(attempt.id);

    const submissions = db
      .prepare('SELECT * FROM submissions WHERE attempt_id = ?')
      .all(attempt.id) as any[];
    const totalScore = submissions.reduce((s: number, sub: any) => s + (sub.score ?? 0), 0);
    const totalMax = submissions.reduce((s: number, sub: any) => s + (sub.max_score ?? 0), 0);

    res.json({ ok: true, score: totalScore, maxScore: totalMax, submissions });
  });

  router.get('/:attemptId/results', requireAuth, (req, res) => {
    const attempt = db
      .prepare('SELECT * FROM attempts WHERE id = ?')
      .get(req.params.attemptId) as any;
    if (!attempt) return res.status(404).json({ error: 'Not found' });

    if (req.user!.role === 'student' && attempt.student_id !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const submissions = db
      .prepare(
        'SELECT s.*, q.title, q.type FROM submissions s JOIN questions q ON s.question_id = q.id WHERE s.attempt_id = ?'
      )
      .all(attempt.id) as any[];

    res.json({
      attempt,
      submissions: submissions.map(s => ({
        ...s,
        grading_results: s.grading_results ? JSON.parse(s.grading_results) : [],
      })),
    });
  });

  router.get('/test/:testId/results', requireAuth, requireRole('lecturer'), (req, res) => {
    const test = db
      .prepare('SELECT * FROM tests WHERE id = ? AND lecturer_id = ?')
      .get(req.params.testId, req.user!.userId) as any;
    if (!test) return res.status(404).json({ error: 'Not found' });

    const attempts = db
      .prepare(
        `
      SELECT a.*, u.name as student_name, u.email as student_email,
        SUM(s.score) as total_score, SUM(s.max_score) as total_max
      FROM attempts a
      JOIN users u ON a.student_id = u.id
      LEFT JOIN submissions s ON s.attempt_id = a.id
      WHERE a.test_id = ?
      GROUP BY a.id
      ORDER BY a.submitted_at DESC
    `
      )
      .all(req.params.testId);

    res.json(attempts);
  });

  return router;
}
