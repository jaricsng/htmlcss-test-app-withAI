import { User } from './api';

/**
 * Reads the authenticated user from `localStorage`.
 *
 * @returns The stored {@link User} object, or `null` if not logged in or the stored value is corrupt.
 */
export function getUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('user') ?? 'null');
  } catch {
    return null;
  }
}

/**
 * Persists a successful login or registration to `localStorage`.
 * Stores both the JWT (for API requests) and the user object (for UI rendering).
 *
 * @param token - JWT string returned by the server.
 * @param user  - User object returned by the server.
 */
export function setSession(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Removes the token and user from `localStorage`, effectively logging the user out.
 * After this call, {@link getUser} returns `null` and API requests will receive 401.
 */
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
