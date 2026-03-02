/**
 * Tests for components/GamesTable.jsx
 * Covers: empty state, rendering, result classes, accuracy, url, date
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GamesTable from '../../components/GamesTable';

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

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('GamesTable empty state', () => {
  it('returns null when games is empty array', () => {
    const { container } = render(<GamesTable games={[]} username="hikaru" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when games is undefined', () => {
    const { container } = render(<GamesTable username="hikaru" />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('GamesTable rendering', () => {
  it('shows correct game count for single game', () => {
    render(<GamesTable games={[baseGame]} username="hikaru" />);
    expect(screen.getByText('1 game found')).toBeInTheDocument();
  });

  it('shows correct game count for multiple games', () => {
    render(<GamesTable games={[baseGame, baseGame]} username="hikaru" />);
    expect(screen.getByText('2 games found')).toBeInTheDocument();
  });

  it('renders player usernames and ratings', () => {
    render(<GamesTable games={[baseGame]} username="hikaru" />);
    expect(screen.getByText(/hikaru/)).toBeInTheDocument();
    expect(screen.getByText(/magnus/)).toBeInTheDocument();
    expect(screen.getByText(/3000/)).toBeInTheDocument();
    expect(screen.getByText(/2900/)).toBeInTheDocument();
  });

  it('renders game mode', () => {
    render(<GamesTable games={[baseGame]} username="hikaru" />);
    expect(screen.getByText('blitz')).toBeInTheDocument();
  });

  it('renders view link', () => {
    render(<GamesTable games={[baseGame]} username="hikaru" />);
    const link = screen.getByRole('link', { name: /view/i });
    expect(link).toHaveAttribute('href', 'https://chess.com/game/1');
  });

  it('renders — when url is missing', () => {
    const game = { ...baseGame, url: null };
    render(<GamesTable games={[game]} username="hikaru" />);
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
  });

  it('renders — when rating is null', () => {
    const game = { ...baseGame, white_rating: null, black_rating: null };
    render(<GamesTable games={[game]} username="hikaru" />);
    expect(screen.queryByText(/3000/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Result classes
// ---------------------------------------------------------------------------
describe('GamesTable result display', () => {
  it('shows Win with correct class', () => {
    render(<GamesTable games={[baseGame]} username="hikaru" />);
    const cell = screen.getByText('Win');
    expect(cell).toHaveClass('result-win');
  });

  it('shows Loss with correct class', () => {
    const game = { ...baseGame, white_result: 'checkmated', white_username: 'magnus', black_username: 'hikaru' };
    render(<GamesTable games={[game]} username="magnus" />);
    const cell = screen.getByText('Loss');
    expect(cell).toHaveClass('result-loss');
  });

  it('shows Draw with correct class', () => {
    const game = { ...baseGame, white_result: 'agreed' };
    render(<GamesTable games={[game]} username="hikaru" />);
    const cell = screen.getByText('Draw');
    expect(cell).toHaveClass('result-draw');
  });
});

// ---------------------------------------------------------------------------
// Accuracy
// ---------------------------------------------------------------------------
describe('GamesTable accuracy display', () => {
  it('renders white and black accuracy', () => {
    render(<GamesTable games={[baseGame]} username="hikaru" />);
    expect(screen.getByText(/95\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/88\.2%/)).toBeInTheDocument();
  });

  it('renders — when accuracy is null', () => {
    const game = { ...baseGame, accuracies: { white: null, black: null } };
    render(<GamesTable games={[game]} username="hikaru" />);
    const dashes = screen.getAllByText(/—/);
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders — when accuracies object is missing', () => {
    const game = { ...baseGame, accuracies: null };
    render(<GamesTable games={[game]} username="hikaru" />);
    const dashes = screen.getAllByText(/—/);
    expect(dashes.length).toBeGreaterThan(0);
  });
});