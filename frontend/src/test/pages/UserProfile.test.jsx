/* eslint-disable no-undef */
/**
 * Tests for pages/UserProfile.jsx
 * Covers: loading state, successful profile fetch, error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  await waitFor(() => {
    expect(screen.getAllByText(/could not validate credentials/i).length).toBeGreaterThanOrEqual(1);
  });
  });

  it('shows generic http error when no detail provided', async () => {
  mockFetch(false, {}, 500);
  renderUserProfile();

  await waitFor(() => {
    expect(screen.getAllByText(/request failed \(http 500\)/i).length).toBeGreaterThanOrEqual(1);
  });
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
// ---------------------------------------------------------------------------
// Reviewed games table
// Append these test cases to the bottom of UserProfile.test.jsx
// ---------------------------------------------------------------------------

// Add `userEvent` import at top of file if not already present:
// import userEvent from '@testing-library/user-event';
// Also add `useNavigate` mock at top:
// const mockNavigate = vi.fn();
// vi.mock('react-router-dom', async () => {
//   const actual = await vi.importActual('react-router-dom');
//   return { ...actual, useNavigate: () => mockNavigate };
// });

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGames = [
  {
    user_id: 11,
    game_id: 'https://www.chess.com/game/live/111',
    game_url: 'https://www.chess.com/game/live/111',
    pgn: '1. e4 e5',
    time_control: '600',
    white_username: 'hikaru',
    black_username: 'magnuscarlsen',
    white_rating: 3000,
    black_rating: 2850,
    white_result: 'win',
    black_result: 'checkmated',
    white_accuracy: 95.0,
    black_accuracy: 88.0,
    white_acpl: null,
    black_acpl: null,
    analysis_status: 'done',
    created_at: '2026-04-01T10:00:00Z',
  },
  {
    user_id: 11,
    game_id: 'https://www.chess.com/game/live/222',
    game_url: 'https://www.chess.com/game/live/222',
    pgn: '1. d4 d5',
    time_control: '300',
    white_username: 'thepunypawn',
    black_username: 'hikaru',
    white_rating: 600,
    black_rating: 3000,
    white_result: 'resigned',
    black_result: 'win',
    white_accuracy: null,
    black_accuracy: null,
    white_acpl: null,
    black_acpl: null,
    analysis_status: 'in_progress',
    created_at: '2026-04-02T10:00:00Z',
  },
];

function mockFetchBoth(profileData, gamesData) {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url === '/api/game-history/') {
      return Promise.resolve({ ok: true, json: async () => ({ games: gamesData }) });
    }
    return Promise.resolve({ ok: true, json: async () => profileData });
  });
}

describe('UserProfile reviewed games table', () => {
  it('fetches game history on mount', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
    renderUserProfile();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game-history/',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
        })
      );
    });
  });

  it('renders reviewed games table with correct player names', async () => {
  mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
  renderUserProfile();
  await waitFor(() => {
    expect(screen.getAllByText('hikaru').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('magnuscarlsen')).toBeInTheDocument();
    expect(screen.getByText('thepunypawn')).toBeInTheDocument();
  });
});

  it('renders player ratings in the table', async () => {
  mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
  renderUserProfile();
  await waitFor(() => {
    expect(screen.getAllByText('(3000)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(2850)')).toBeInTheDocument();
    expect(screen.getByText('(600)')).toBeInTheDocument();
  });
});

  it('renders serial numbers starting from 1', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
    renderUserProfile();
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders done status badge for completed games', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
    renderUserProfile();
    await waitFor(() => {
      expect(screen.getByText(/✓ Complete/)).toBeInTheDocument();
    });
  });

  it('renders in progress status badge for incomplete games', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
    renderUserProfile();
    await waitFor(() => {
      expect(screen.getByText(/⏳ In Progress/)).toBeInTheDocument();
    });
  });

  it('renders Review Again buttons for each game', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
    renderUserProfile();
    await waitFor(() => {
      const buttons = screen.getAllByText('Review Again');
      expect(buttons).toHaveLength(2);
    });
  });

  it('navigates to review page with correct game state when Review Again is clicked', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, mockGames);
    renderUserProfile();
    await waitFor(() => screen.getAllByText('Review Again'));
    fireEvent.click(screen.getAllByText('Review Again')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/review', {
      state: {
        game: expect.objectContaining({
          url:            mockGames[0].game_url,
          pgn:            mockGames[0].pgn,
          white_username: mockGames[0].white_username,
          black_username: mockGames[0].black_username,
          white_result:   mockGames[0].white_result,
          black_result:   mockGames[0].black_result,
        }),
      },
    });
  });

  it('shows empty state message when no games reviewed', async () => {
    mockFetchBoth({ email: 'test@test.com', password: '********' }, []);
    renderUserProfile();
    await waitFor(() => {
      expect(screen.getByText(/you haven't reviewed any games yet/i)).toBeInTheDocument();
    });
  });

  it('shows games error message on failed game history fetch', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/game-history/') {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ detail: 'Server error' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ email: 'test@test.com', password: '********' }) });
    });
    renderUserProfile();
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('shows games error on network failure for game history', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/game-history/') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ ok: true, json: async () => ({ email: 'test@test.com', password: '********' }) });
    });
    renderUserProfile();
    await waitFor(() => {
      expect(screen.getByText(/could not load game history/i)).toBeInTheDocument();
    });
  });

  it('shows loading spinner while fetching game history', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderUserProfile();
    expect(screen.getByText(/loading game history/i)).toBeInTheDocument();
  });
});