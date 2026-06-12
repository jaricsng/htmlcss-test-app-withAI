import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { setSession, clearSession } from '../../lib/auth';
import type { User } from '../../lib/api';

// Mock useNavigate so logout doesn't throw
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLayout(user: User | null, title?: string) {
  if (user) setSession('token', user);
  else clearSession();

  return render(
    <MemoryRouter>
      <Layout title={title}>
        <div>Page content</div>
      </Layout>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
});

describe('Layout', () => {
  it('renders children', () => {
    renderLayout({ id: 1, email: 'a@b.com', name: 'Alice', role: 'student' });
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('shows the brand name', () => {
    renderLayout({ id: 1, email: 'a@b.com', name: 'Alice', role: 'student' });
    expect(screen.getByText('HTML/CSS Tester')).toBeInTheDocument();
  });

  it('shows the user name', () => {
    renderLayout({ id: 1, email: 'a@b.com', name: 'Dr Smith', role: 'lecturer' });
    expect(screen.getByText('Dr Smith')).toBeInTheDocument();
  });

  it('shows a Lecturer badge for lecturers', () => {
    renderLayout({ id: 1, email: 'a@b.com', name: 'Dr Smith', role: 'lecturer' });
    expect(screen.getByText('Lecturer')).toBeInTheDocument();
  });

  it('shows a Student badge for students', () => {
    renderLayout({ id: 2, email: 'b@b.com', name: 'Alice', role: 'student' });
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('shows optional title prop in the header', () => {
    renderLayout({ id: 1, email: 'a@b.com', name: 'Alice', role: 'student' }, 'My Tests');
    expect(screen.getByText('My Tests')).toBeInTheDocument();
  });

  it('clears session and navigates to /login on logout', async () => {
    const user = userEvent.setup();
    renderLayout({ id: 1, email: 'a@b.com', name: 'Alice', role: 'student' });

    await user.click(screen.getByText('Logout'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
