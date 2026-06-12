import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Lecturer: list own tests
router.get('/my', requireAuth, requireRole('lecturer'), (req, res) => {
  const tests = db.prepare(
    'SELECT * FROM tests WHERE lecturer_id = ? ORDER BY created_at DESC'
  ).all(req.user!.userId);
  res.json(tests);
});

// Student: list published tests
router.get('/available', requireAuth, requireRole('student'), (req, res) => {
  const tests = db.prepare(
    `SELECT t.*, u.name as lecturer_name,
     (SELECT id FROM attempts WHERE test_id = t.id AND student_id = ?) as attempt_id,
     (SELECT status FROM attempts WHERE test_id = t.id AND student_id = ?) as attempt_status
     FROM tests t JOIN users u ON t.lecturer_id = u.id
     WHERE t.status = 'published' ORDER BY t.published_at DESC`
  ).all(req.user!.userId, req.user!.userId);
  res.json(tests);
});

// Get single test (with questions)
router.get('/:id', requireAuth, (req, res) => {
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id) as any;
  if (!test) return res.status(404).json({ error: 'Not found' });

  // Students can only see published tests
  if (req.user!.role === 'student' && test.status !== 'published') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const questions = db.prepare(
    'SELECT * FROM questions WHERE test_id = ? ORDER BY order_index'
  ).all(req.params.id);

  // Include criteria for lecturers only
  if (req.user!.role === 'lecturer') {
    const questionsWithCriteria = questions.map((q: any) => ({
      ...q,
      criteria: db.prepare('SELECT * FROM criteria WHERE question_id = ?').all(q.id),
    }));
    return res.json({ ...test, questions: questionsWithCriteria });
  }

  res.json({ ...test, questions });
});

// Lecturer: create test
router.post('/', requireAuth, requireRole('lecturer'), (req, res) => {
  const { title, description, time_limit_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const result = db.prepare(
    'INSERT INTO tests (lecturer_id, title, description, time_limit_minutes) VALUES (?, ?, ?, ?)'
  ).run(req.user!.userId, title, description ?? null, time_limit_minutes ?? null);

  res.json({ id: result.lastInsertRowid });
});

// Lecturer: update test
router.put('/:id', requireAuth, requireRole('lecturer'), (req, res) => {
  const test = db.prepare(
    'SELECT * FROM tests WHERE id = ? AND lecturer_id = ?'
  ).get(req.params.id, req.user!.userId);
  if (!test) return res.status(404).json({ error: 'Not found' });

  const { title, description, time_limit_minutes, status } = req.body;
  db.prepare(
    `UPDATE tests SET title = COALESCE(?, title), description = COALESCE(?, description),
     time_limit_minutes = COALESCE(?, time_limit_minutes),
     status = COALESCE(?, status),
     published_at = CASE WHEN ? = 'published' THEN unixepoch() ELSE published_at END
     WHERE id = ?`
  ).run(title, description, time_limit_minutes, status, status, req.params.id);

  res.json({ ok: true });
});

// Lecturer: delete test
router.delete('/:id', requireAuth, requireRole('lecturer'), (req, res) => {
  db.prepare('DELETE FROM tests WHERE id = ? AND lecturer_id = ?')
    .run(req.params.id, req.user!.userId);
  res.json({ ok: true });
});

export default router;
