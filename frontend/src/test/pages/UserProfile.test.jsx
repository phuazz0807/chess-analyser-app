/* eslint-disable no-undef */
/**
 * Tests for pages/UserProfile.jsx
 * Covers: loading state, successful profile fetch, error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserProfile from '../../pages/UserProfile';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../App.css', () => ({}));

import { useAuth } from '../../context/AuthContext';

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.mockReturnValue({ token: 'mock-token' });
});

function mockFetch(ok, data, status = ok ? 200 : 400) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

function renderUserProfile() {
  return render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('UserProfile loading state', () => {
  it('shows loading spinner while fetching profile', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderUserProfile();
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Successful fetch
// ---------------------------------------------------------------------------
describe('UserProfile successful fetch', () => {
  it('renders email and masked password after successful fetch', async () => {
    mockFetch(true, { email: 'test@test.com', password: '********' });
    renderUserProfile();

    await waitFor(() => {
      expect(screen.getByText('test@test.com')).toBeInTheDocument();
      expect(screen.getByText('********')).toBeInTheDocument();
    });
  });

  it('calls fetch with correct auth header', async () => {
    mockFetch(true, { email: 'test@test.com', password: '********' });
    renderUserProfile();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', {
        headers: { Authorization: 'Bearer mock-token' },
      });
    });
  });

  it('does not show loading spinner after fetch completes', async () => {
    mockFetch(true, { email: 'test@test.com', password: '********' });
    renderUserProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Error states
// ---------------------------------------------------------------------------
describe('UserProfile error states', () => {
  it('shows error message from backend detail on failed fetch', async () => {
    mockFetch(false, { detail: 'Could not validate credentials' }, 401);
    renderUserProfile();

    expect(await screen.findByText(/could not validate credentials/i)).toBeInTheDocument();
  });

  it('shows generic http error when no detail provided', async () => {
    mockFetch(false, {}, 500);
    renderUserProfile();

    expect(await screen.findByText(/request failed \(http 500\)/i)).toBeInTheDocument();
  });

  it('shows server unreachable error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));
    renderUserProfile();

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it('does not show profile card on error', async () => {
    mockFetch(false, { detail: 'Unauthorized' }, 401);
    renderUserProfile();

    await waitFor(() => {
      expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
    });
  });
});