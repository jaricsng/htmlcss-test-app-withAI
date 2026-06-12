import { describe, it, expect, beforeEach } from 'vitest';
import { getUser, setSession, clearSession } from '../../lib/auth';
import type { User } from '../../lib/api';

const MOCK_USER: User = { id: 1, email: 'test@test.com', name: 'Test User', role: 'student' };
const MOCK_TOKEN = 'eyJ.mock.token';

beforeEach(() => {
  localStorage.clear();
});

describe('setSession', () => {
  it('persists token and user to localStorage', () => {
    setSession(MOCK_TOKEN, MOCK_USER);
    expect(localStorage.getItem('token')).toBe(MOCK_TOKEN);
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(MOCK_USER);
  });
});

describe('getUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getUser()).toBeNull();
  });

  it('returns the stored user object', () => {
    setSession(MOCK_TOKEN, MOCK_USER);
    expect(getUser()).toEqual(MOCK_USER);
  });

  it('returns null when stored JSON is corrupt', () => {
    localStorage.setItem('user', '{invalid json}');
    expect(getUser()).toBeNull();
  });
});

describe('clearSession', () => {
  it('removes token and user from localStorage', () => {
    setSession(MOCK_TOKEN, MOCK_USER);
    clearSession();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('does not throw when nothing is stored', () => {
    expect(() => clearSession()).not.toThrow();
  });
});
