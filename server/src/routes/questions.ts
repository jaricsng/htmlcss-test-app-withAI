import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function ownsTest(testId: string | number, lecturerId: number) {
  return db.prepare('SELECT id FROM tests WHERE id = ? AND lecturer_id = ?').get(testId, lecturerId);
}

// Create question
router.post('/', requireAuth, requireRole('lecturer'), (req, res) => {
  const { test_id, type, order_index, title, description, starter_html, starter_css,
    reference_html, reference_css, mcq_options, mcq_correct_index, total_points } = req.body;

  if (!ownsTest(test_id, req.user!.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = db.prepare(`
    INSERT INTO questions (test_id, type, order_index, title, description, starter_html,
      starter_css, reference_html, reference_css, mcq_options, mcq_correct_index, total_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    test_id, type, order_index ?? 0, title, description,
    starter_html ?? '', starter_css ?? '',
    reference_html ?? '', reference_css ?? '',
    mcq_options ? JSON.stringify(mcq_options) : null,
    mcq_correct_index ?? null,
    total_points ?? 10
  );

  res.json({ id: result.lastInsertRowid });
});

// Update question
router.put('/:id', requireAuth, requireRole('lecturer'), (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  if (!question || !ownsTest(question.test_id, req.user!.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type, order_index, title, description, starter_html, starter_css,
    reference_html, reference_css, mcq_options, mcq_correct_index, total_points } = req.body;

  db.prepare(`
    UPDATE questions SET
      type = COALESCE(?, type), order_index = COALESCE(?, order_index),
      title = COALESCE(?, title), description = COALESCE(?, description),
      starter_html = COALESCE(?, starter_html), starter_css = COALESCE(?, starter_css),
      reference_html = COALESCE(?, reference_html), reference_css = COALESCE(?, reference_css),
      mcq_options = COALESCE(?, mcq_options), mcq_correct_index = COALESCE(?, mcq_correct_index),
      total_points = COALESCE(?, total_points)
    WHERE id = ?
  `).run(
    type, order_index, title, description, starter_html, starter_css,
    reference_html, reference_css,
    mcq_options ? JSON.stringify(mcq_options) : null,
    mcq_correct_index, total_points, req.params.id
  );

  res.json({ ok: true });
});

// Delete question
router.delete('/:id', requireAuth, requireRole('lecturer'), (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  if (!question || !ownsTest(question.test_id, req.user!.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Add criterion to question
router.post('/:id/criteria', requireAuth, requireRole('lecturer'), (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as any;
  if (!question || !ownsTest(question.test_id, req.user!.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type, label, selector, attribute, expected_value, css_property, points } = req.body;
  const result = db.prepare(`
    INSERT INTO criteria (question_id, type, label, selector, attribute, expected_value, css_property, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, type, label, selector ?? null, attribute ?? null,
    expected_value ?? null, css_property ?? null, points ?? 1);

  res.json({ id: result.lastInsertRowid });
});

// Delete criterion
router.delete('/criteria/:criterionId', requireAuth, requireRole('lecturer'), (req, res) => {
  const criterion = db.prepare(
    'SELECT c.*, q.test_id FROM criteria c JOIN questions q ON c.question_id = q.id WHERE c.id = ?'
  ).get(req.params.criterionId) as any;

  if (!criterion || !ownsTest(criterion.test_id, req.user!.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('DELETE FROM criteria WHERE id = ?').run(req.params.criterionId);
  res.json({ ok: true });
});

export default router;
