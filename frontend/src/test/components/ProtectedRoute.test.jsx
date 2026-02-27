/**
 * Tests for components/ProtectedRoute.jsx
 * Covers: loading state, unauthenticated redirect, authenticated render
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

function renderProtectedRoute(authState) {
  useAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('ProtectedRoute loading', () => {
  it('shows loading spinner while auth is being determined', () => {
    renderProtectedRoute({ isAuthenticated: false, loading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated
// ---------------------------------------------------------------------------
describe('ProtectedRoute unauthenticated', () => {
  it('redirects to /login when not authenticated', () => {
    renderProtectedRoute({ isAuthenticated: false, loading: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Authenticated
// ---------------------------------------------------------------------------
describe('ProtectedRoute authenticated', () => {
  it('renders children when authenticated', () => {
    renderProtectedRoute({ isAuthenticated: true, loading: false });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
