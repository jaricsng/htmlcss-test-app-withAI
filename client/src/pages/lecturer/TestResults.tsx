import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { attemptsApi, testsApi, Attempt, TestWithQuestions } from '../../lib/api';

/**
 * Lecturer view of all student attempts for a single test.
 *
 * Displays a summary row (total attempts, submitted count, class average)
 * and a sortable table of individual attempts with score, percentage progress
 * bar, submission timestamp, and a "Details" link to the student's result breakdown.
 */
export default function TestResults() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      testsApi.getTest(Number(id)),
      attemptsApi.testResults(Number(id)),
    ]).then(([t, a]) => {
      setTest(t);
      setAttempts(a);
    }).finally(() => setLoading(false));
  }, [id]);

  const submitted = attempts.filter(a => a.status === 'submitted');
  const avgScore = submitted.length
    ? submitted.reduce((s, a) => s + (a.total_score ?? 0), 0) / submitted.length
    : 0;
  const avgMax = submitted.length
    ? submitted.reduce((s, a) => s + (a.total_max ?? 0), 0) / submitted.length
    : 0;

  return (
    <Layout
      title={`Results: ${test?.title ?? ''}`}
      actions={
        <Link to={`/lecturer/tests/${id}/edit`} className="btn-secondary text-xs">Edit Test</Link>
      }
    >
      <div className="mb-6 flex items-center gap-3">
        <Link to="/lecturer" className="text-sm text-blue-600 hover:underline">← Back</Link>
        <h2 className="text-2xl font-bold">{test?.title}</h2>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{attempts.length}</div>
              <div className="text-sm text-gray-500 mt-1">Total Attempts</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{submitted.length}</div>
              <div className="text-sm text-gray-500 mt-1">Submitted</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {avgMax > 0 ? Math.round((avgScore / avgMax) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Average Score</div>
            </div>
          </div>

          {/* Attempts table */}
          {attempts.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">No attempts yet</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">%</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attempts.map(a => {
                    const pct = a.total_max ? Math.round(((a.total_score ?? 0) / a.total_max) * 100) : 0;
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{a.student_name}</div>
                          <div className="text-xs text-gray-400">{a.student_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${a.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {a.status === 'submitted' ? `${a.total_score} / ${a.total_max}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a.status === 'submitted' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span>{pct}%</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {a.submitted_at ? new Date(a.submitted_at * 1000).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a.status === 'submitted' && (
                            <Link to={`/student/attempts/${a.id}/results`} className="text-blue-600 hover:underline text-xs">
                              Details
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
