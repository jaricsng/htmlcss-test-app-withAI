import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/schema.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, name, password, role } = req.body;
  if (!email || !name || !password || !['lecturer', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid fields' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(email, name, hash, role);

  const token = signToken({ userId: result.lastInsertRowid as number, role, name });
  res.json({ token, user: { id: result.lastInsertRowid, email, name, role } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ userId: user.id, role: user.role, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

export default router;
