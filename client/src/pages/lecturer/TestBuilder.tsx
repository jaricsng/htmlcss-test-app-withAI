import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import CodeEditor from '../../components/CodeEditor';
import LivePreview from '../../components/LivePreview';
import { testsApi, questionsApi, TestWithQuestions, Question, Criterion } from '../../lib/api';

/** Dropdown options for the question type selector. */
const QUESTION_TYPES = [
  { value: 'code-from-scratch', label: 'Code from Scratch' },
  { value: 'fix-the-bug', label: 'Fix the Bug' },
  { value: 'match-output', label: 'Match the Output' },
  { value: 'mcq', label: 'Multiple Choice' },
] as const;

/**
 * Full-screen test editor for lecturers.
 *
 * Layout: a fixed sidebar (test metadata + question list) and a main panel
 * that switches between three tabs — Question (fields), Criteria (grading rules),
 * and Preview (live render of starter/reference code).
 *
 * All field edits are saved on blur via individual API calls (`saveTestMeta`,
 * `saveQuestion`). Questions and criteria are managed optimistically — the UI
 * updates immediately and the API call runs in the background.
 */
export default function TestBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [editTab, setEditTab] = useState<'question' | 'criteria' | 'preview'>('question');

  useEffect(() => {
    if (!id) return;
    testsApi.getTest(Number(id)).then(t => {
      setTest(t);
      if (t.questions.length > 0) setActiveQuestion(0);
    });
  }, [id]);

  async function saveTestMeta(field: string, value: string | number) {
    if (!test) return;
    setSaving(true);
    try {
      await testsApi.updateTest(test.id, { [field]: value });
      setTest(t => (t ? { ...t, [field]: value } : t));
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion() {
    if (!test) return;
    const order = test.questions.length;
    const { id: qid } = await questionsApi.createQuestion({
      test_id: test.id,
      type: 'code-from-scratch',
      order_index: order,
      title: `Question ${order + 1}`,
      description: 'Write your description here.',
      starter_html: '',
      starter_css: '',
      reference_html: '',
      reference_css: '',
      total_points: 10,
    });
    const newQ: Question = {
      id: qid,
      test_id: test.id,
      type: 'code-from-scratch',
      order_index: order,
      title: `Question ${order + 1}`,
      description: 'Write your description here.',
      starter_html: '',
      starter_css: '',
      reference_html: '',
      reference_css: '',
      total_points: 10,
      criteria: [],
    };
    setTest(t => (t ? { ...t, questions: [...t.questions, newQ] } : t));
    setActiveQuestion(order);
    setEditTab('question');
  }

  async function deleteQuestion(idx: number) {
    if (!test) return;
    const q = test.questions[idx];
    if (!confirm('Delete this question?')) return;
    await questionsApi.deleteQuestion(q.id);
    const updated = test.questions.filter((_, i) => i !== idx);
    setTest(t => (t ? { ...t, questions: updated } : t));
    setActiveQuestion(idx > 0 ? idx - 1 : updated.length > 0 ? 0 : null);
  }

  async function saveQuestion(idx: number, changes: Partial<Question>) {
    if (!test) return;
    const q = test.questions[idx];
    await questionsApi.updateQuestion(q.id, changes);
    setTest(t => {
      if (!t) return t;
      const qs = [...t.questions];
      qs[idx] = { ...qs[idx], ...changes };
      return { ...t, questions: qs };
    });
  }

  async function addCriterion(
    questionIdx: number,
    criterion: Omit<Criterion, 'id' | 'question_id'>
  ) {
    if (!test) return;
    const q = test.questions[questionIdx];
    const { id: cid } = await questionsApi.addCriterion(q.id, criterion);
    const newC: Criterion = { ...criterion, id: cid, question_id: q.id };
    setTest(t => {
      if (!t) return t;
      const qs = [...t.questions];
      qs[questionIdx] = {
        ...qs[questionIdx],
        criteria: [...(qs[questionIdx].criteria ?? []), newC],
      };
      return { ...t, questions: qs };
    });
  }

  async function deleteCriterion(questionIdx: number, criterionId: number) {
    if (!test) return;
    await questionsApi.deleteCriterion(criterionId);
    setTest(t => {
      if (!t) return t;
      const qs = [...t.questions];
      qs[questionIdx] = {
        ...qs[questionIdx],
        criteria: qs[questionIdx].criteria?.filter(c => c.id !== criterionId),
      };
      return { ...t, questions: qs };
    });
  }

  const currentQ = activeQuestion !== null ? test?.questions[activeQuestion] : null;

  if (!test)
    return (
      <Layout>
        <div className="text-center py-12 text-gray-400">Loading…</div>
      </Layout>
    );

  return (
    <Layout
      title={test.title}
      actions={
        <div className="flex gap-2">
          {test.status === 'draft' && (
            <button
              className="btn-primary text-xs"
              onClick={() => saveTestMeta('status', 'published')}
            >
              Publish Test
            </button>
          )}
          {test.status === 'published' && (
            <button
              className="btn-secondary text-xs"
              onClick={() => saveTestMeta('status', 'closed')}
            >
              Close Test
            </button>
          )}
          <button className="btn-secondary text-xs" onClick={() => navigate('/lecturer')}>
            Back
          </button>
        </div>
      }
    >
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          {/* Test meta */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="label" htmlFor="test-title">
                Test Title
              </label>
              <input
                id="test-title"
                className="input"
                defaultValue={test.title}
                onBlur={e => saveTestMeta('title', e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="test-description">
                Description
              </label>
              <textarea
                id="test-description"
                className="input resize-none"
                rows={2}
                defaultValue={test.description ?? ''}
                onBlur={e => saveTestMeta('description', e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="test-time-limit">
                Time Limit (minutes)
              </label>
              <input
                id="test-time-limit"
                className="input"
                type="number"
                defaultValue={test.time_limit_minutes ?? ''}
                onBlur={e => saveTestMeta('time_limit_minutes', Number(e.target.value))}
                placeholder="No limit"
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`badge ${test.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
              >
                {test.status}
              </span>
              {saving && <span className="text-xs text-gray-400">Saving…</span>}
            </div>
          </div>

          {/* Questions list */}
          <div className="card flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium">Questions</span>
              <button className="text-blue-600 text-xs hover:underline" onClick={addQuestion}>
                + Add
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {test.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setActiveQuestion(i);
                    setEditTab('question');
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeQuestion === i
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium truncate">{q.title}</div>
                  <div className="text-xs text-gray-400">
                    {q.type} · {q.total_points}pts
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentQ && activeQuestion !== null ? (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-3">
                {(['question', 'criteria', 'preview'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setEditTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      editTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => deleteQuestion(activeQuestion)}
                  className="ml-auto btn-danger text-xs px-3"
                >
                  Delete Question
                </button>
              </div>

              {editTab === 'question' && (
                <QuestionEditor
                  question={currentQ}
                  onSave={changes => saveQuestion(activeQuestion, changes)}
                />
              )}
              {editTab === 'criteria' && (
                <CriteriaEditor
                  question={currentQ}
                  onAdd={c => addCriterion(activeQuestion, c)}
                  onDelete={id => deleteCriterion(activeQuestion, id)}
                />
              )}
              {editTab === 'preview' && (
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <LivePreview
                    html={currentQ.starter_html}
                    css={currentQ.starter_css}
                    title="Starter Code Preview"
                  />
                  <LivePreview
                    html={currentQ.reference_html}
                    css={currentQ.reference_css}
                    title="Reference / Expected Output"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="card flex-1 flex items-center justify-center text-gray-400">
              Select a question or click &quot;+ Add&quot; to create one
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

/**
 * Form for editing a single question's metadata and content.
 *
 * Provides type-specific fields: code editors (starter/reference HTML+CSS) for
 * code questions, or a radio-option list for MCQ questions. Each field saves on
 * blur via `onSave`. The local `field()` helper wires Monaco editor props
 * (value, onChange, onBlur) to the local state copy, so edits are reflected
 * in the preview tab without requiring a round-trip.
 */
function QuestionEditor({
  question,
  onSave,
}: {
  question: Question;
  onSave: (c: Partial<Question>) => void;
}) {
  const [local, setLocal] = useState(question);
  useEffect(() => setLocal(question), [question.id]);

  function field(name: keyof Question) {
    return {
      value: (local[name] ?? '') as string,
      onChange: (val: string) => setLocal(q => ({ ...q, [name]: val })),
      onBlur: () => onSave({ [name]: local[name] }),
    };
  }

  const isMcq = local.type === 'mcq';
  const mcqOptions: string[] = local.mcq_options ? JSON.parse(local.mcq_options) : ['', '', '', ''];

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="q-title">
            Title
          </label>
          <input
            id="q-title"
            className="input"
            defaultValue={question.title}
            onBlur={e => onSave({ title: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="q-type">
            Type
          </label>
          <select
            id="q-type"
            className="input"
            value={local.type}
            onChange={e => {
              const t = e.target.value as Question['type'];
              setLocal(q => ({ ...q, type: t }));
              onSave({ type: t });
            }}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="q-description">
          Description / Instructions
        </label>
        <textarea
          id="q-description"
          className="input resize-none"
          rows={3}
          defaultValue={question.description}
          onBlur={e => onSave({ description: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="q-points">
          Total Points
        </label>
        <input
          id="q-points"
          className="input w-32"
          type="number"
          defaultValue={question.total_points}
          onBlur={e => onSave({ total_points: Number(e.target.value) })}
        />
      </div>

      {!isMcq && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <CodeEditor
              language="html"
              label="Starter HTML"
              {...field('starter_html')}
              height="200px"
            />
            <CodeEditor
              language="css"
              label="Starter CSS"
              {...field('starter_css')}
              height="200px"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CodeEditor
              language="html"
              label="Reference HTML (answer)"
              {...field('reference_html')}
              height="200px"
            />
            <CodeEditor
              language="css"
              label="Reference CSS (answer)"
              {...field('reference_css')}
              height="200px"
            />
          </div>
        </>
      )}

      {isMcq && (
        <div className="space-y-3">
          <label className="label">Answer Options</label>
          {mcqOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct"
                checked={local.mcq_correct_index === i}
                onChange={() => {
                  setLocal(q => ({ ...q, mcq_correct_index: i }));
                  onSave({ mcq_correct_index: i });
                }}
                title="Mark as correct answer"
              />
              <input
                className="input flex-1"
                placeholder={`Option ${i + 1}`}
                defaultValue={opt}
                onBlur={e => {
                  const opts = [...mcqOptions];
                  opts[i] = e.target.value;
                  onSave({ mcq_options: JSON.stringify(opts) });
                }}
              />
            </div>
          ))}
          <p className="text-xs text-gray-400">
            Select the radio button next to the correct answer.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Lists existing grading criteria for a question and provides a form to add new ones.
 *
 * Supports two criterion types:
 * - **DOM Check** — verifies element existence, or an attribute/text value.
 * - **CSS Style Check** — verifies a CSS property value on a selector.
 *
 * The form resets label, selector, and value fields after each successful add,
 * keeping type and points unchanged for rapid entry of similar criteria.
 */
function CriteriaEditor({
  question,
  onAdd,
  onDelete,
}: {
  question: Question;
  onAdd: (c: Omit<Criterion, 'id' | 'question_id'>) => void;
  onDelete: (id: number) => void;
}) {
  const [form, setForm] = useState({
    type: 'dom' as 'dom' | 'style',
    label: '',
    selector: '',
    attribute: '',
    expected_value: '',
    css_property: '',
    points: 1,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd({ ...form });
    setForm(f => ({
      ...f,
      label: '',
      selector: '',
      attribute: '',
      expected_value: '',
      css_property: '',
    }));
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4">
      <div className="card p-4">
        <h3 className="font-medium mb-3 text-sm">Existing Criteria</h3>
        {!question.criteria || question.criteria.length === 0 ? (
          <p className="text-sm text-gray-400">No criteria yet. Add some below.</p>
        ) : (
          <div className="space-y-2">
            {question.criteria!.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2"
              >
                <span
                  className={`badge ${c.type === 'dom' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}
                >
                  {c.type}
                </span>
                <span className="flex-1">{c.label}</span>
                <span className="text-gray-500">
                  {c.points}pt{c.points !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-medium mb-3 text-sm">Add Criterion</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as 'dom' | 'style' }))}
              >
                <option value="dom">DOM Check</option>
                <option value="style">CSS Style Check</option>
              </select>
            </div>
            <div>
              <label className="label">Points</label>
              <input
                className="input"
                type="number"
                min={1}
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Label (shown to student in results)</label>
            <input
              className="input"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              required
              placeholder="e.g. Has a nav element"
            />
          </div>
          <div>
            <label className="label">CSS Selector</label>
            <input
              className="input"
              value={form.selector}
              onChange={e => setForm(f => ({ ...f, selector: e.target.value }))}
              placeholder="e.g. nav, h1.title, #main"
            />
          </div>
          {form.type === 'dom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Attribute (optional)</label>
                <input
                  className="input"
                  value={form.attribute}
                  onChange={e => setForm(f => ({ ...f, attribute: e.target.value }))}
                  placeholder="e.g. class, href, id"
                />
              </div>
              <div>
                <label className="label">Expected Value (optional)</label>
                <input
                  className="input"
                  value={form.expected_value}
                  onChange={e => setForm(f => ({ ...f, expected_value: e.target.value }))}
                  placeholder="e.g. navbar"
                />
              </div>
            </div>
          )}
          {form.type === 'style' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CSS Property</label>
                <input
                  className="input"
                  value={form.css_property}
                  onChange={e => setForm(f => ({ ...f, css_property: e.target.value }))}
                  placeholder="e.g. color, background-color"
                />
              </div>
              <div>
                <label className="label">Expected Value</label>
                <input
                  className="input"
                  value={form.expected_value}
                  onChange={e => setForm(f => ({ ...f, expected_value: e.target.value }))}
                  placeholder="e.g. red, #ff0000, 16px"
                />
              </div>
            </div>
          )}
          <button className="btn-primary text-sm" type="submit">
            Add Criterion
          </button>
        </form>
      </div>

      <div className="card p-4 bg-blue-50 border-blue-200">
        <p className="text-xs text-blue-700 font-medium mb-1">Tips for criteria:</p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>
            <strong>DOM Check</strong>: Verify an element exists, or that an attribute equals a
            value
          </li>
          <li>
            <strong>CSS Style Check</strong>: Verify a CSS property on a selector (from stylesheet
            or inline styles)
          </li>
          <li>Leave Expected Value empty to just check element/property existence</li>
        </ul>
      </div>
    </div>
  );
}
