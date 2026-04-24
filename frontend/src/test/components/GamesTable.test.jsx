/**
 * Tests for components/GamesTable.jsx
 * Covers: empty state, rendering, result classes, accuracy, url, date
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GamesTable from '../../components/GamesTable';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock helpers
vi.mock('../../helpers', () => ({
  formatDate: (ts) => ts ? '2025-01-01' : '—',
  computeResult: (game, username) => {
    if (game.white_username === username) {
      if (game.white_result === 'win') return { label: 'Win', className: 'result-win' };
      if (game.white_result === 'checkmated') return { label: 'Loss', className: 'result-loss' };
      return { label: 'Draw', className: 'result-draw' };
    }
    return { label: 'Unknown', className: 'result-unknown' };
  },
}));

const baseGame = {
  url: 'https://chess.com/game/1',
  time_class: 'blitz',
  white_username: 'hikaru',
  white_rating: 3000,
  white_result: 'win',
  black_username: 'magnus',
  black_rating: 2900,
  black_result: 'checkmated',
  accuracies: { white: 95.5, black: 88.2 },
  end_time: 1700000000,
};

function renderTable(games, username = 'hikaru') {
  return render(
    <MemoryRouter>
      <GamesTable games={games} username={username} />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('GamesTable empty state', () => {
  it('returns null when games is empty array', () => {
    const { container } = renderTable([]);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when games is undefined', () => {
    const { container } = renderTable(undefined);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('GamesTable rendering', () => {
  it('shows correct game count for single game', () => {
    renderTable([baseGame]);
    expect(screen.getByText('1 game found')).toBeInTheDocument();
  });

  it('shows correct game count for multiple games', () => {
    renderTable([baseGame, baseGame]);
    expect(screen.getByText('2 games found')).toBeInTheDocument();
  });

  it('renders player usernames and ratings', () => {
    renderTable([baseGame]);
    expect(screen.getByText(/hikaru/)).toBeInTheDocument();
    expect(screen.getByText(/magnus/)).toBeInTheDocument();
    expect(screen.getByText(/3000/)).toBeInTheDocument();
    expect(screen.getByText(/2900/)).toBeInTheDocument();
  });

  it('renders game mode', () => {
    renderTable([baseGame]);
    expect(screen.getByText('blitz')).toBeInTheDocument();
  });

  it('renders view link', () => {
    renderTable([baseGame]);
    const link = screen.getByRole('link', { name: /view/i });
    expect(link).toHaveAttribute('href', 'https://chess.com/game/1');
  });

  it('renders — when url is missing', () => {
    const game = { ...baseGame, url: null };
    renderTable([game]);
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
  });

  it('renders — when rating is null', () => {
    const game = { ...baseGame, white_rating: null, black_rating: null };
    renderTable([game]);
    expect(screen.queryByText(/3000/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Result classes
// ---------------------------------------------------------------------------
describe('GamesTable result display', () => {
  it('shows Win with correct class', () => {
    renderTable([baseGame]);
    const cell = screen.getByText('Win');
    expect(cell).toHaveClass('result-win');
  });

  it('shows Loss with correct class', () => {
    const game = { ...baseGame, white_result: 'checkmated', white_username: 'magnus', black_username: 'hikaru' };
    renderTable([game], "magnus");
    const cell = screen.getByText('Loss');
    expect(cell).toHaveClass('result-loss');
  });

  it('shows Draw with correct class', () => {
    const game = { ...baseGame, white_result: 'agreed' };
    renderTable([game]);
    const cell = screen.getByText('Draw');
    expect(cell).toHaveClass('result-draw');
  });
});

// ---------------------------------------------------------------------------
// Accuracy
// ---------------------------------------------------------------------------
describe('GamesTable accuracy display', () => {
  it('renders white and black accuracy', () => {
    renderTable([baseGame]);
    expect(screen.getByText(/95\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/88\.2%/)).toBeInTheDocument();
  });

  it('renders — when accuracy is null', () => {
    const game = { ...baseGame, accuracies: { white: null, black: null } };
    renderTable([game]);
    const dashes = screen.getAllByText(/—/);
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders — when accuracies object is missing', () => {
    const game = { ...baseGame, accuracies: null };
    renderTable([game]);
    const dashes = screen.getAllByText(/—/);
    expect(dashes.length).toBeGreaterThan(0);
  });
});
// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
describe('GamesTable navigation', () => {
  it('renders Review button', () => {
    renderTable([baseGame]);
    expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
  });

  it('navigates to /review with game data when Review button is clicked', () => {
    mockNavigate.mockClear();
    renderTable([baseGame]);
    fireEvent.click(screen.getByRole('button', { name: /review/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/review', {
      state: { game: baseGame, username: 'hikaru' },
    });
  });

  it('navigates to /review when row is clicked', () => {
    mockNavigate.mockClear();
    renderTable([baseGame]);
    fireEvent.click(screen.getByText('blitz'));
    expect(mockNavigate).toHaveBeenCalledWith('/review', {
      state: { game: baseGame, username: 'hikaru' },
    });
  });

  it('does not navigate when View link is clicked', () => {
    mockNavigate.mockClear();
    renderTable([baseGame]);
    fireEvent.click(screen.getByRole('link', { name: /view/i }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});