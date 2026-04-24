/**
 * Tests for api/auth.jsx
 * Covers: loginUser, registerUser, getCurrentUser, validatePassword
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUser, registerUser, getCurrentUser, validatePassword } from '../../api/auth';

// ---- fetch mock setup ----
beforeEach(() => {
  vi.resetAllMocks();
});

function mockFetch(ok, data, status = ok ? 200 : 400) {
  // eslint-disable-next-line no-undef
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

// ---------------------------------------------------------------------------
// validatePassword
// ---------------------------------------------------------------------------
describe('validatePassword', () => {
  it('returns valid for a strong password', () => {
    const result = validatePassword('StrongP@ss1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when password is too short', () => {
    const { isValid, errors } = validatePassword('Sh0rt!');
    expect(isValid).toBe(false);
    expect(errors).toContain('Password must be at least 8 characters long');
  });

  it('fails when no uppercase letter', () => {
    const { isValid, errors } = validatePassword('lowercase1!');
    expect(isValid).toBe(false);
    expect(errors).toContain('Password must contain at least one uppercase letter');
  });

  it('fails when no digit', () => {
    const { isValid, errors } = validatePassword('NoDigits!A');
    expect(isValid).toBe(false);
    expect(errors).toContain('Password must contain at least one digit');
  });

  it('fails when no special character', () => {
    const { isValid, errors } = validatePassword('NoSpecial1A');
    expect(isValid).toBe(false);
    expect(errors).toContain('Password must contain at least one special character');
  });

  it('accumulates multiple errors', () => {
    const { isValid, errors } = validatePassword('weak');
    expect(isValid).toBe(false);
    expect(errors.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------
describe('loginUser', () => {
  it('returns token on successful login', async () => {
    mockFetch(true, { access_token: 'abc123', token_type: 'bearer' });
    const result = await loginUser('test@test.com', 'Password1!');
    expect(result.access_token).toBe('abc123');
    // eslint-disable-next-line no-undef
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'Password1!' }),
    }));
  });

  it('throws error on failed login', async () => {
    mockFetch(false, { detail: 'Invalid email or password' });
    await expect(loginUser('bad@test.com', 'wrong')).rejects.toThrow('Invalid email or password');
  });

  it('throws generic error if no detail in response', async () => {
    mockFetch(false, {});
    await expect(loginUser('bad@test.com', 'wrong')).rejects.toThrow('Login failed');
  });
});

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------
describe('registerUser', () => {
  it('returns message on successful registration', async () => {
    mockFetch(true, { message: 'Registration successful. Please log in.' });
    const result = await registerUser('new@test.com', 'Password1!');
    expect(result.message).toBe('Registration successful. Please log in.');
  });

  it('throws error with detail string on failure', async () => {
    mockFetch(false, { detail: 'An account with this email already exists' });
    await expect(registerUser('exists@test.com', 'Password1!')).rejects.toThrow('An account with this email already exists');
  });

  it('joins array of pydantic validation errors', async () => {
    mockFetch(false, { detail: [{ msg: 'field required' }, { msg: 'invalid email' }] });
    await expect(registerUser('bad', 'pass')).rejects.toThrow('field required, invalid email');
  });

  it('throws generic error if no detail in response', async () => {
    mockFetch(false, {});
    await expect(registerUser('x@x.com', 'pass')).rejects.toThrow('Registration failed');
  });
});

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------
describe('getCurrentUser', () => {
  it('returns user data on success', async () => {
    const user = { user_id: 1, email: 'test@test.com', is_active: true };
    mockFetch(true, user);
    const result = await getCurrentUser('valid-token');
    expect(result.email).toBe('test@test.com');
    // eslint-disable-next-line no-undef
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
    }));
  });

  it('throws error on invalid token', async () => {
    mockFetch(false, { detail: 'Could not validate credentials' }, 401);
    await expect(getCurrentUser('bad-token')).rejects.toThrow('Could not validate credentials');
  });

  it('throws generic error if no detail in response', async () => {
    mockFetch(false, {}, 500);
    await expect(getCurrentUser('token')).rejects.toThrow('Failed to get user info');
  });
});