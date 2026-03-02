/**
 * Tests for pages/LoginPage.jsx
 * Covers: rendering, validation, successful login, failed login, success message from register
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

const mockLogin = vi.fn();
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
  useAuth.mockReturnValue({ login: mockLogin });
});

function renderLogin(locationState = null) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: locationState }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('LoginPage rendering', () => {
  it('renders email, password fields and sign in button', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /register here/i })).toBeInTheDocument();
  });

  it('shows success message when redirected from registration', () => {
    renderLogin({ message: 'Registration successful! Please log in.' });
    expect(screen.getByText('Registration successful! Please log in.')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('LoginPage validation', () => {
  it('shows error when email is empty', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error when password is empty', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/please enter your password/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------
describe('LoginPage successful login', () => {
  it('calls login and navigates to dashboard on success', async () => {
    mockLogin.mockResolvedValueOnce();
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'Password1!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('navigates to the original attempted URL if available', async () => {
    mockLogin.mockResolvedValueOnce();
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/profile' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });
    });
  });

  it('shows signing in... and disables button while loading', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // never resolves
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password1!');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// Failed login
// ---------------------------------------------------------------------------
describe('LoginPage failed login', () => {
  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid email or password'));
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows generic error message if none provided', async () => {
    mockLogin.mockRejectedValueOnce(new Error());
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/login failed. please try again/i)).toBeInTheDocument();
  });
});