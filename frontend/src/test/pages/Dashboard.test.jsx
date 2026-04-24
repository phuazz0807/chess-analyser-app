/* eslint-disable no-undef */
/**
 * Tests for pages/Dashboard.jsx
 * Covers: rendering, loading state, error state, no games, games table, server error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';

// Mock child components to isolate Dashboard logic
vi.mock('../../components/QueryForm', () => ({
  default: ({ onSubmit, loading }) => (
    <button
      onClick={() => onSubmit({ username: 'hikaru', startDate: '2025-01-01', endDate: '2025-01-31' })}
      disabled={loading}
    >
      {loading ? 'Loading...' : 'Fetch Games'}
    </button>
  ),
}));

vi.mock('../../components/GamesTable', () => ({
  default: ({ games }) => (
    <div data-testid="games-table">{games.length} games</div>
  ),
}));

vi.mock('../../App.css', () => ({}));

beforeEach(() => {
  vi.resetAllMocks();
});

function mockFetch(ok, data, status = ok ? 200 : 400) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('Dashboard rendering', () => {
  it('renders the header and query form', () => {
    renderDashboard();
    expect(screen.getByText(/chess analyser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch games/i })).toBeInTheDocument();
  });

  it('does not show error, loading, or no games message initially', () => {
    renderDashboard();
    expect(screen.queryByText(/could not reach/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no games found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fetching games/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('Dashboard loading state', () => {
  it('shows loading spinner while fetching', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /fetch games/i }));
    expect(await screen.findByText(/fetching games/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
describe('Dashboard error state', () => {
  it('shows api error message on failed fetch', async () => {
    mockFetch(false, { detail: 'No games found for the given criteria.' }, 404);
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /fetch games/i }));
    expect(await screen.findByText(/no games found for the given criteria/i)).toBeInTheDocument();
  });

  it('shows generic error when detail is missing', async () => {
    mockFetch(false, {}, 500);
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /fetch games/i }));
    expect(await screen.findByText(/request failed \(http 500\)/i)).toBeInTheDocument();
  });

  it('shows server unreachable error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /fetch games/i }));
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// No games found
// ---------------------------------------------------------------------------
describe('Dashboard no games state', () => {
  it('shows no games message when search returns empty array', async () => {
    mockFetch(true, { games: [] });
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /fetch games/i }));
    expect(await screen.findByText(/no games found for the given criteria/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Games returned
// ---------------------------------------------------------------------------
describe('Dashboard games state', () => {
  it('renders games table when games are returned', async () => {
    mockFetch(true, { games: [{ url: 'https://chess.com/game/1' }] });
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /fetch games/i }));
    expect(await screen.findByTestId('games-table')).toBeInTheDocument();
    expect(screen.getByText('1 games')).toBeInTheDocument();
  });
});