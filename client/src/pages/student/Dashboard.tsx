import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { testsApi, attemptsApi, Test } from '../../lib/api';

/**
 * Student home page — lists all published tests with the student's attempt status.
 *
 * Each card shows one of three states:
 * - **No attempt** — "Start Test" button; clicking creates an attempt then navigates to TestRoom.
 * - **In progress** — "Continue" button; navigates directly to TestRoom.
 * - **Submitted** — "View Results" link to the ResultsPage.
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    testsApi.availableTests().then(setTests).finally(() => setLoading(false));
  }, []);

  async function startTest(testId: number) {
    setStarting(testId);
    try {
      await attemptsApi.start(testId);
      navigate(`/student/tests/${testId}`);
    } finally {
      setStarting(null);
    }
  }

  return (
    <Layout title="Available Tests">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Available Tests</h2>
        <p className="text-gray-500 text-sm mt-1">Click a test to start or continue</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : tests.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          No tests available right now. Check back later.
        </div>
      ) : (
        <div className="grid gap-4">
          {tests.map(test => {
            const done = test.attempt_status === 'submitted';
            const inProgress = test.attempt_status === 'in_progress';
            return (
              <div key={test.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{test.title}</h3>
                  {test.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{test.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>By {test.lecturer_name}</span>
                    {test.time_limit_minutes && <span>· {test.time_limit_minutes} min</span>}
                    {done && <span className="text-green-600 font-medium">· Submitted</span>}
                    {inProgress && <span className="text-yellow-600 font-medium">· In Progress</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {done ? (
                    <Link to={`/student/attempts/${test.attempt_id}/results`} className="btn-secondary text-xs">
                      View Results
                    </Link>
                  ) : (
                    <button
                      className={inProgress ? 'btn-secondary text-xs' : 'btn-primary text-xs'}
                      onClick={() => startTest(test.id)}
                      disabled={starting === test.id}
                    >
                      {starting === test.id ? 'Loading…' : inProgress ? 'Continue' : 'Start Test'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
