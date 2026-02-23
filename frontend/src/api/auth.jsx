/**
 * Authentication API functions for communicating with the backend.
 */

const API_BASE = '/api/auth';

/**
 * Login user with email and password.
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{access_token: string, token_type: string}>}
 */
export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Login failed');
  }

  return data;
}

/**
 * Register a new user account.
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{message: string}>}
 */
export async function registerUser(email, password) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle validation errors from Pydantic
    if (data.detail && Array.isArray(data.detail)) {
      const messages = data.detail.map((err) => err.msg || err.message).join(', ');
      throw new Error(messages);
    }
    throw new Error(data.detail || 'Registration failed');
  }

  return data;
}

/**
 * Get current user information.
 * @param {string} token - JWT access token
 * @returns {Promise<{user_id: number, email: string, is_active: boolean, created_at: string}>}
 */
export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to get user info');
  }

  return data;
}

/**
 * Validate password against security requirements.
 * @param {string} password - Password to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}