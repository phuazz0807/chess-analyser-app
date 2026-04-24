/**
 * Tests for context/AuthContext.jsx
 * Covers: initial load, login, logout, register, invalid token on mount, useAuth outside provider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock api/auth.jsx
vi.mock('../../api/auth.jsx', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

import { loginUser, registerUser, getCurrentUser } from '../../api/auth.jsx';

const TOKEN_KEY = 'chess_analyser_token';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// Helper component to expose auth context values
function AuthConsumer({ onRender }) {
  const auth = useAuth();
  onRender(auth);
  return <div>rendered</div>;
}

function renderWithAuth(onRender, token = null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  return render(
    <AuthProvider>
      <AuthConsumer onRender={onRender} />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Initial load — no token
// ---------------------------------------------------------------------------
describe('AuthContext initial load', () => {
  it('starts unauthenticated when no token in localStorage', async () => {
    getCurrentUser.mockResolvedValue({ user_id: 1, email: 'test@test.com' });
    let auth;
    renderWithAuth((a) => { auth = a; });

    await waitFor(() => expect(auth.loading).toBe(false));
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
  });

  it('loads user from valid token in localStorage on mount', async () => {
    getCurrentUser.mockResolvedValue({ user_id: 1, email: 'test@test.com' });
    let auth;
    renderWithAuth((a) => { auth = a; }, 'valid-token');

    await waitFor(() => expect(auth.loading).toBe(false));
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user.email).toBe('test@test.com');
  });

  it('clears token and user when token is invalid on mount', async () => {
    getCurrentUser.mockRejectedValue(new Error('Invalid token'));
    let auth;
    renderWithAuth((a) => { auth = a; }, 'bad-token');

    await waitFor(() => expect(auth.loading).toBe(false));
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
describe('AuthContext login', () => {
  it('sets user and token on successful login', async () => {
    loginUser.mockResolvedValue({ access_token: 'new-token' });
    getCurrentUser.mockResolvedValue({ user_id: 1, email: 'test@test.com' });

    let auth;
    renderWithAuth((a) => { auth = a; });
    await waitFor(() => expect(auth.loading).toBe(false));

    await act(async () => {
      await auth.login('test@test.com', 'Password1!');
    });

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user.email).toBe('test@test.com');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
  });

  it('throws error on failed login', async () => {
    loginUser.mockRejectedValue(new Error('Invalid credentials'));
    getCurrentUser.mockResolvedValue(null);

    let auth;
    renderWithAuth((a) => { auth = a; });
    await waitFor(() => expect(auth.loading).toBe(false));

    await expect(
      act(async () => { await auth.login('bad@test.com', 'wrong'); })
    ).rejects.toThrow('Invalid credentials');
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
describe('AuthContext logout', () => {
  it('clears user, token and localStorage on logout', async () => {
    getCurrentUser.mockResolvedValue({ user_id: 1, email: 'test@test.com' });

    let auth;
    renderWithAuth((a) => { auth = a; }, 'valid-token');
    await waitFor(() => expect(auth.loading).toBe(false));

    act(() => { auth.logout(); });

    await waitFor(() => {
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
      expect(auth.token).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
describe('AuthContext register', () => {
  it('calls registerUser and returns response', async () => {
    getCurrentUser.mockResolvedValue(null);
    registerUser.mockResolvedValue({ message: 'Registration successful. Please log in.' });

    let auth;
    renderWithAuth((a) => { auth = a; });
    await waitFor(() => expect(auth.loading).toBe(false));

    let result;
    await act(async () => {
      result = await auth.register('new@test.com', 'Password1!');
    });

    expect(registerUser).toHaveBeenCalledWith('new@test.com', 'Password1!');
    expect(result.message).toBe('Registration successful. Please log in.');
  });

  it('throws error on failed registration', async () => {
    getCurrentUser.mockResolvedValue(null);
    registerUser.mockRejectedValue(new Error('Email already exists'));

    let auth;
    renderWithAuth((a) => { auth = a; });
    await waitFor(() => expect(auth.loading).toBe(false));

    await expect(
      act(async () => { await auth.register('exists@test.com', 'Password1!'); })
    ).rejects.toThrow('Email already exists');
  });
});

// ---------------------------------------------------------------------------
// useAuth outside provider
// ---------------------------------------------------------------------------
describe('useAuth outside provider', () => {
  it('throws error when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AuthConsumer onRender={() => {}} />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});