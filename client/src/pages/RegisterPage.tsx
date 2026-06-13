import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { setSession } from '../lib/auth';

/**
 * Public registration form.
 * Collects name, email, password, and role (Student / Lecturer) via a toggled
 * button pair. On success, persists the session and redirects to the appropriate dashboard.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'student' as 'lecturer' | 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.register(
        form.email,
        form.name,
        form.password,
        form.role
      );
      setSession(token, user);
      navigate(user.role === 'lecturer' ? '/lecturer' : '/student');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">HTML/CSS Tester</h1>
          <p className="text-gray-500 mt-1 text-sm">Create a new account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="label" htmlFor="reg-name">
              Full Name
            </label>
            <input
              id="reg-name"
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              className="input"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              className="input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {(['student', 'lecturer'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                    form.role === r
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full justify-center py-2.5" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
