import { Link, useNavigate } from 'react-router-dom';
import { getUser, clearSession } from '../lib/auth';

interface Props {
  /** Page body content rendered below the header. */
  children: React.ReactNode;
  /** Optional page title shown in the header bar (hidden on small screens). */
  title?: string;
  /** Optional action buttons/links rendered in the header bar, to the right of the title. */
  actions?: React.ReactNode;
}

/**
 * Application shell shared by all authenticated pages.
 *
 * Renders a sticky header with the app logo, a role badge (Lecturer / Student),
 * the user's display name, and a Logout button. The logo links to the role-appropriate
 * dashboard (`/lecturer` or `/student`). Logging out calls {@link clearSession} and
 * redirects to `/login`.
 */
export default function Layout({ children, title, actions }: Props) {
  const user = getUser();
  const navigate = useNavigate();

  function logout() {
    clearSession();
    navigate('/login');
  }

  const homeLink = user?.role === 'lecturer' ? '/lecturer' : '/student';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link to={homeLink} className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-600">HTML/CSS Tester</span>
          {user?.role === 'lecturer' && (
            <span className="badge bg-blue-100 text-blue-700 ml-1">Lecturer</span>
          )}
          {user?.role === 'student' && (
            <span className="badge bg-green-100 text-green-700 ml-1">Student</span>
          )}
        </Link>
        <div className="flex items-center gap-4">
          {title && <h1 className="text-base font-semibold text-gray-800 hidden sm:block">{title}</h1>}
          {actions}
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button onClick={logout} className="btn-secondary text-xs px-3 py-1.5">Logout</button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
