import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { testsApi, Test } from '../../lib/api';

/** Tailwind class pairs for each test status badge. */
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
};

/**
 * Lecturer home page — lists all tests owned by the authenticated lecturer.
 *
 * Actions per test card: Edit (→ TestBuilder), Results (→ TestResults), Delete.
 * The "+ New Test" button creates an untitled draft and immediately navigates
 * to the TestBuilder so the lecturer can start editing without an extra step.
 */
export default function LecturerDashboard() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    testsApi.myTests().then(setTests).finally(() => setLoading(false));
  }, []);

  async function createTest() {
    setCreating(true);
    try {
      const { id } = await testsApi.createTest({ title: 'Untitled Test' });
      navigate(`/lecturer/tests/${id}/edit`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteTest(id: number) {
    if (!confirm('Delete this test? This cannot be undone.')) return;
    await testsApi.deleteTest(id);
    setTests(t => t.filter(x => x.id !== id));
  }

  return (
    <Layout title="My Tests" actions={
      <button className="btn-primary" onClick={createTest} disabled={creating}>
        {creating ? 'Creating…' : '+ New Test'}
      </button>
    }>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">My Tests</h2>
        <p className="text-gray-500 text-sm mt-1">Create and manage HTML/CSS assessments</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading…</div>
      ) : tests.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 mb-4">No tests yet</p>
          <button className="btn-primary" onClick={createTest}>Create your first test</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {tests.map(test => (
            <div key={test.id} className="card p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{test.title}</h3>
                  <span className={`badge ${STATUS_BADGE[test.status]}`}>{test.status}</span>
                </div>
                {test.description && (
                  <p className="text-sm text-gray-500 truncate">{test.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(test.created_at * 1000).toLocaleDateString()}
                  {test.time_limit_minutes && ` · ${test.time_limit_minutes} min limit`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/lecturer/tests/${test.id}/results`} className="btn-secondary text-xs">
                  Results
                </Link>
                <Link to={`/lecturer/tests/${test.id}/edit`} className="btn-secondary text-xs">
                  Edit
                </Link>
                <button onClick={() => deleteTest(test.id)} className="btn-danger text-xs">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
