import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import LivePreview from '../../components/LivePreview';
import { attemptsApi, Attempt, Submission } from '../../lib/api';

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    attemptsApi.getResults(Number(id)).then(({ attempt: a, submissions: subs }) => {
      setAttempt(a);
      setSubmissions(subs);
      setExpanded(subs[0]?.question_id ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  const totalScore = submissions.reduce((s, sub) => s + (sub.score ?? 0), 0);
  const totalMax = submissions.reduce((s, sub) => s + (sub.max_score ?? 0), 0);
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return (
    <Layout title="Test Results">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/student" className="text-sm text-blue-600 hover:underline">← Back to Tests</Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading results…</div>
      ) : (
        <>
          {/* Score summary */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Your Results</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Submitted {attempt?.submitted_at ? new Date(attempt.submitted_at * 1000).toLocaleString() : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-600">{totalScore}<span className="text-2xl text-gray-400">/{totalMax}</span></div>
                <div className="text-lg font-medium text-gray-600 mt-1">{pct}%</div>
              </div>
            </div>
            <div className="mt-4 bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Per-question results */}
          <div className="space-y-4">
            {submissions.map((sub, i) => (
              <div key={sub.question_id} className="card overflow-hidden">
                <button
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === sub.question_id ? null : sub.question_id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      sub.score === sub.max_score ? 'bg-green-100 text-green-700'
                        : sub.score > 0 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium">{sub.title}</div>
                      <div className="text-xs text-gray-400">{sub.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700">{sub.score} / {sub.max_score}</span>
                    <span className="text-gray-400">{expanded === sub.question_id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded === sub.question_id && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* Grading breakdown */}
                    {sub.grading_results.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Grading Breakdown</h4>
                        <div className="space-y-2">
                          {sub.grading_results.map((r, ri) => (
                            <div key={ri} className={`flex items-start gap-3 text-sm rounded-lg p-3 ${
                              r.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                              <span className={r.passed ? 'text-green-600' : 'text-red-500'}>{r.passed ? '✓' : '✗'}</span>
                              <div className="flex-1">
                                <div className="font-medium">{r.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{r.feedback}</div>
                              </div>
                              <span className={`font-medium ${r.passed ? 'text-green-600' : 'text-red-500'}`}>
                                +{r.earned}/{r.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Code preview */}
                    {sub.type !== 'mcq' && (sub.html_code || sub.css_code) && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Your Submission</h4>
                        <LivePreview html={sub.html_code} css={sub.css_code} title="Your Output" className="h-48" />
                      </div>
                    )}

                    {sub.type === 'mcq' && (
                      <p className="text-sm text-gray-600">
                        {sub.score === sub.max_score ? '✓ Correct answer' : '✗ Incorrect answer'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
