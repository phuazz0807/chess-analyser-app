/**
 * Tests for pages/RegisterPage.jsx
 * Covers: rendering, all validation branches, live password feedback,
 *         successful registration, failed registration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from '../../pages/RegisterPage.jsx';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../api/auth.jsx', () => ({
  validatePassword: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext.jsx';
import { validatePassword } from '../../api/auth.jsx';

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ register: mockRegister });
  validatePassword.mockReturnValue({ isValid: true, errors: [] });
});

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('RegisterPage rendering', () => {
  it('renders email, password, confirm password fields and submit button', () => {
    renderRegister();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in here/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('RegisterPage validation', () => {
  it('shows error when email is empty', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when password is empty', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'test@test.com');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/please enter a password/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when password fails validation', async () => {
    validatePassword.mockReturnValue({ isValid: false, errors: ['Password must be at least 8 characters long'] });
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'weak');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Different1!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    const messages = await screen.findAllByText(/passwords do not match/i);
    expect(messages.length).toBeGreaterThan(0);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows inline mismatch error when confirm password differs', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Wrong');
    expect(await screen.findAllByText(/passwords do not match/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Live password feedback
// ---------------------------------------------------------------------------
describe('RegisterPage live password feedback', () => {
  it('shows password requirements after blurring password field', async () => {
    validatePassword.mockReturnValue({ isValid: false, errors: ['Password must be at least 8 characters long'] });
    renderRegister();
    const passwordInput = screen.getByLabelText(/^password/i);
    await userEvent.type(passwordInput, 'weak');
    fireEvent.blur(passwordInput);
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows checkmarks for met requirements', async () => {
    validatePassword.mockReturnValue({ isValid: true, errors: [] });
    renderRegister();
    const passwordInput = screen.getByLabelText(/^password/i);
    await userEvent.type(passwordInput, 'StrongP@ss1');
    fireEvent.blur(passwordInput);
    const checks = await screen.findAllByText('✓');
    expect(checks.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Successful registration
// ---------------------------------------------------------------------------
describe('RegisterPage successful registration', () => {
  it('calls register and navigates to login with success message', async () => {
    mockRegister.mockResolvedValueOnce({ message: 'Registration successful. Please log in.' });
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'new@test.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('new@test.com', 'Password1!');
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { message: 'Registration successful! Please log in.' },
        replace: true,
      });
    });
  });

  it('shows creating account... and disables button while loading', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {}));
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'new@test.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// Failed registration
// ---------------------------------------------------------------------------
describe('RegisterPage failed registration', () => {
  it('shows error message on registration failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('An account with this email already exists'));
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'exists@test.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/an account with this email already exists/i)).toBeInTheDocument();
  });

  it('shows generic error if none provided', async () => {
    mockRegister.mockRejectedValueOnce(new Error());
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^email/i), 'x@test.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/registration failed. please try again/i)).toBeInTheDocument();
  });
});