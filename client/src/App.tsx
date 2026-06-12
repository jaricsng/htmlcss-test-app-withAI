import { Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './lib/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LecturerDashboard from './pages/lecturer/Dashboard';
import TestBuilder from './pages/lecturer/TestBuilder';
import TestResults from './pages/lecturer/TestResults';
import StudentDashboard from './pages/student/Dashboard';
import TestRoom from './pages/student/TestRoom';
import ResultsPage from './pages/student/ResultsPage';

function RequireAuth({ children, role }: { children: React.ReactNode; role: 'lecturer' | 'student' }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'lecturer' ? '/lecturer' : '/student'} replace />;
  return <>{children}</>;
}

export default function App() {
  const user = getUser();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/lecturer" element={<RequireAuth role="lecturer"><LecturerDashboard /></RequireAuth>} />
      <Route path="/lecturer/tests/:id/edit" element={<RequireAuth role="lecturer"><TestBuilder /></RequireAuth>} />
      <Route path="/lecturer/tests/:id/results" element={<RequireAuth role="lecturer"><TestResults /></RequireAuth>} />

      <Route path="/student" element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>} />
      <Route path="/student/tests/:id" element={<RequireAuth role="student"><TestRoom /></RequireAuth>} />
      <Route path="/student/attempts/:id/results" element={<RequireAuth role="student"><ResultsPage /></RequireAuth>} />

      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'lecturer' ? '/lecturer' : '/student'} replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}
