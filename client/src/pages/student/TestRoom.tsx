import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import CodeEditor from '../../components/CodeEditor';
import LivePreview from '../../components/LivePreview';
import { testsApi, attemptsApi, TestWithQuestions, Question, Submission, Attempt } from '../../lib/api';

/**
 * The in-test experience for students.
 *
 * On mount, fetches the test and starts (or resumes) the attempt in parallel.
 * Existing submission data is loaded into a `submissions` map keyed by `question_id`
 * so the student can switch questions without losing edits.
 *
 * Auto-save: `updateSubmission` queues a debounced API call (800ms) via `autoSave`
 * after every change so progress is persisted even if the student closes the tab.
 *
 * Countdown timer: if `time_limit_minutes` is set, a `setTimeout` chain decrements
 * `timeLeft` each second and calls `handleSubmit` automatically at zero.
 *
 * The left sidebar shows question navigation with a green indicator dot for any
 * question that has been answered.
 */
export default function TestRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [submissions, setSubmissions] = useState<Record<number, Partial<Submission>>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      testsApi.getTest(Number(id)),
      attemptsApi.start(Number(id)),
    ]).then(([t, { attempt: a, submissions: subs }]) => {
      setTest(t);
      setAttempt(a);
      const subMap: Record<number, Partial<Submission>> = {};
      subs.forEach(s => { subMap[s.question_id] = s; });
      // Init empty submissions for any question without one
      t.questions.forEach(q => {
        if (!subMap[q.id]) {
          subMap[q.id] = { html_code: q.starter_html, css_code: q.starter_css, mcq_answer_index: undefined };
        }
      });
      setSubmissions(subMap);
      // Set time limit countdown
      if (t.time_limit_minutes && a.started_at) {
        const deadline = a.started_at + t.time_limit_minutes * 60;
        const remaining = deadline - Math.floor(Date.now() / 1000);
        if (remaining > 0) setTimeLeft(remaining);
      }
    });
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const autoSave = useCallback((questionId: number, data: Partial<Submission>) => {
    if (!attempt) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await attemptsApi.saveProgress(attempt.id, questionId, data);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [attempt]);

  function updateSubmission(questionId: number, changes: Partial<Submission>) {
    setSubmissions(s => {
      const updated = { ...s, [questionId]: { ...(s[questionId] ?? {}), ...changes } };
      autoSave(questionId, updated[questionId]);
      return updated;
    });
  }

  async function handleSubmit() {
    if (!attempt) return;
    if (!window.confirm('Submit this test? You cannot make changes after submitting.')) return;
    setSubmitting(true);
    try {
      await attemptsApi.submit(attempt.id);
      navigate(`/student/attempts/${attempt.id}/results`);
    } finally {
      setSubmitting(false);
    }
  }

  const currentQ: Question | undefined = test?.questions[activeIdx];
  const currentSub = currentQ ? (submissions[currentQ.id] ?? {}) : {};

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  if (!test || !attempt) {
    return <Layout><div className="text-center py-12 text-gray-400">Loading test…</div></Layout>;
  }

  return (
    <Layout
      title={test.title}
      actions={
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          {timeLeft !== null && (
            <span className={`font-mono text-sm font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeLeft)}
            </span>
          )}
          <button
            className="btn-primary text-xs"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Test'}
          </button>
        </div>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-120px)]">
        {/* Question nav */}
        <div className="w-48 shrink-0 flex flex-col gap-2">
          <div className="card p-3">
            <p className="text-xs text-gray-500 font-medium mb-2">Questions</p>
            <div className="space-y-1">
              {test.questions.map((q, i) => {
                const sub = submissions[q.id];
                const hasCode = sub?.html_code || sub?.css_code || sub?.mcq_answer_index !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      activeIdx === i ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                      hasCode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="truncate text-xs">{q.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        {currentQ && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="card p-4 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{currentQ.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{currentQ.description}</p>
                </div>
                <span className="badge bg-blue-100 text-blue-700 shrink-0">{currentQ.total_points} pts</span>
              </div>
            </div>

            {currentQ.type === 'mcq' ? (
              <McqEditor
                question={currentQ}
                selected={currentSub.mcq_answer_index}
                onChange={idx => updateSubmission(currentQ.id, { mcq_answer_index: idx })}
              />
            ) : (
              <CodeWorkspace
                question={currentQ}
                html={currentSub.html_code ?? currentQ.starter_html}
                css={currentSub.css_code ?? currentQ.starter_css}
                onHtmlChange={v => updateSubmission(currentQ.id, { html_code: v })}
                onCssChange={v => updateSubmission(currentQ.id, { css_code: v })}
                showReference={currentQ.type === 'match-output'}
                refHtml={currentQ.reference_html}
                refCss={currentQ.reference_css}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

/**
 * Renders MCQ options as large clickable radio-button cards.
 * Empty options (blank strings) are filtered out so lecturers can leave
 * unused option slots blank without affecting the student view.
 */
function McqEditor({
  question, selected, onChange,
}: {
  question: Question;
  selected?: number;
  onChange: (idx: number) => void;
}) {
  const options: string[] = question.mcq_options ? JSON.parse(question.mcq_options) : [];
  return (
    <div className="card p-5 flex-1">
      <div className="space-y-3">
        {options.filter(Boolean).map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              selected === i
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`mcq-${question.id}`}
              checked={selected === i}
              onChange={() => onChange(i)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Side-by-side layout of HTML + CSS editors and a live preview panel.
 * When `showReference` is true (match-output questions), a second preview
 * showing the target output is rendered below the student's output so they
 * can compare visually.
 */
function CodeWorkspace({
  html, css, onHtmlChange, onCssChange, showReference, refHtml, refCss,
}: {
  question?: Question;
  html: string; css: string;
  onHtmlChange: (v: string) => void;
  onCssChange: (v: string) => void;
  showReference: boolean;
  refHtml: string; refCss: string;
}) {
  return (
    <div className="flex-1 overflow-hidden flex gap-4">
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <CodeEditor language="html" label="HTML" value={html} onChange={onHtmlChange} height="50%" />
        <CodeEditor language="css" label="CSS" value={css} onChange={onCssChange} height="50%" />
      </div>
      <div className="w-96 shrink-0 flex flex-col gap-3">
        <LivePreview html={html} css={css} title="Your Output" className="flex-1" />
        {showReference && (
          <LivePreview html={refHtml} css={refCss} title="Target Output" className="flex-1" />
        )}
      </div>
    </div>
  );
}
