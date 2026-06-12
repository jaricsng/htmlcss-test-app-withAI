import express from 'express';
import cors from 'cors';
import './db/schema.js';
import authRouter from './routes/auth.js';
import testsRouter from './routes/tests.js';
import questionsRouter from './routes/questions.js';
import attemptsRouter from './routes/attempts.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/tests', testsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/attempts', attemptsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
