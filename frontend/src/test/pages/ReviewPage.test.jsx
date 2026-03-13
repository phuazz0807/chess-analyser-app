/**
 * Tests for pages/ReviewPage.jsx
 * Covers: rendering, player info, move navigation, move list click,
 *         show best move toggle, result modal, analysis text
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReviewPage from '../../pages/ReviewPage';

// Mock Chessboard to avoid canvas/resize issues in jsdom
vi.mock('react-chessboard', () => ({
  Chessboard: ({ position }) => <div data-testid="chessboard" data-position={position} />,
}));

vi.mock('./ReviewPage.css', () => ({}));

const mockGame = {
  white_username: 'hikaru',
  white_rating: 3000,
  black_username: 'magnuscarlsen',
  black_rating: 2850,
  white_result: 'win',
  black_result: 'checkmated',
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6',
  time_class: 'blitz',
};

const drawGame = {
  ...mockGame,
  white_result: 'agreed',
  black_result: 'agreed',
};

const blackWinsGame = {
  ...mockGame,
  white_result: 'checkmated',
  black_result: 'win',
};

function renderReviewPage(game = null) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/review', state: game ? { game } : null }]}>
      <Routes>
        <Route path="/review" element={<ReviewPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('ReviewPage rendering', () => {
  it('renders the chessboard', () => {
    renderReviewPage(mockGame);
    expect(screen.getByTestId('chessboard')).toBeInTheDocument();
  });

  it('renders player names and ratings', () => {
    renderReviewPage(mockGame);
    expect(screen.getByText('hikaru')).toBeInTheDocument();
    expect(screen.getByText('3000')).toBeInTheDocument();
    expect(screen.getByText('magnuscarlsen')).toBeInTheDocument();
    expect(screen.getByText('2850')).toBeInTheDocument();
  });

  it('renders with placeholder game when no router state', () => {
    renderReviewPage();
    expect(screen.getByText('hikaru')).toBeInTheDocument();
    expect(screen.getByText('magnuscarlsen')).toBeInTheDocument();
  });

  it('renders move list', () => {
    renderReviewPage(mockGame);
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
  });

  it('shows starting position label initially', () => {
    renderReviewPage(mockGame);
    expect(screen.getByText('Starting Position')).toBeInTheDocument();
  });

  it('shows starting position analysis text initially', () => {
    renderReviewPage(mockGame);
    expect(screen.getByText(/navigate through the game/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Navigation buttons
// ---------------------------------------------------------------------------
describe('ReviewPage navigation', () => {
  it('start and back buttons are disabled at move 0', () => {
    renderReviewPage(mockGame);
    expect(screen.getByTitle('Start')).toBeDisabled();
    expect(screen.getByTitle('Previous')).toBeDisabled();
  });

  it('forward and end buttons are enabled at move 0', () => {
    renderReviewPage(mockGame);
    expect(screen.getByTitle('Next')).not.toBeDisabled();
    expect(screen.getByTitle('End')).not.toBeDisabled();
  });

  it('advances move index when Next is clicked', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('Next'));
    expect(screen.getByText(/1\. e4/)).toBeInTheDocument();
  });

  it('goes back when Previous is clicked after advancing', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('Next'));
    fireEvent.click(screen.getByTitle('Previous'));
    expect(screen.getByText('Starting Position')).toBeInTheDocument();
  });

  it('disables Next and End at last move', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    expect(screen.getByTitle('Next')).toBeDisabled();
    expect(screen.getByTitle('End')).toBeDisabled();
  });

  it('enables Start and Previous at last move', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    expect(screen.getByTitle('Start')).not.toBeDisabled();
    expect(screen.getByTitle('Previous')).not.toBeDisabled();
  });

  it('goes to start when Start button is clicked', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    fireEvent.click(screen.getByTitle('Start'));
    expect(screen.getByText('Starting Position')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Move list click
// ---------------------------------------------------------------------------
describe('ReviewPage move list', () => {
  it('jumps to a move when clicked in the move list', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByText('e4'));
    expect(screen.getByText(/1\. e4/)).toBeInTheDocument();
  });

  it('highlights the active move in the list', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByText('e4'));
    expect(screen.getByText('e4')).toHaveClass('review-move-san--active');
  });
});

// ---------------------------------------------------------------------------
// Show best move
// ---------------------------------------------------------------------------
describe('ReviewPage show best move', () => {
  it('shows show best move button initially', () => {
    renderReviewPage(mockGame);
    expect(screen.getByText(/show best move/i)).toBeInTheDocument();
  });

  it('toggles to back to game when clicked', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByText(/show best move/i));
    expect(screen.getByText(/back to game/i)).toBeInTheDocument();
  });

  it('shows best move analysis text when active', () => {
  renderReviewPage(mockGame);
  fireEvent.click(screen.getByTitle('Next'));
  fireEvent.click(screen.getByRole('button', { name: /show best move/i }));
  expect(screen.getByText(/best move shown/i)).toBeInTheDocument();
});

  it('resets best move when navigating', () => {
  renderReviewPage(mockGame);
  fireEvent.click(screen.getByTitle('Next'));
  fireEvent.click(screen.getByRole('button', { name: /show best move/i }));
  fireEvent.click(screen.getByTitle('Next'));
  expect(screen.getByRole('button', { name: /show best move/i })).toBeInTheDocument();
});
});

// ---------------------------------------------------------------------------
// Result modal
// ---------------------------------------------------------------------------
describe('ReviewPage result modal', () => {
  it('shows result modal when End is clicked', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    expect(screen.getByText('White Wins')).toBeInTheDocument();
  });

  it('shows win method in modal', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    expect(screen.getByText(/checkmate/i)).toBeInTheDocument();
  });

  it('shows winner username in modal', () => {
  renderReviewPage(mockGame);
  fireEvent.click(screen.getByTitle('End'));
  expect(screen.getByText('hikaru', { selector: '.result-modal-username' })).toBeInTheDocument();
});

  it('shows Black Wins when black wins', () => {
    renderReviewPage(blackWinsGame);
    fireEvent.click(screen.getByTitle('End'));
    expect(screen.getByText('Black Wins')).toBeInTheDocument();
  });

  it('shows Draw label for draw game', () => {
    renderReviewPage(drawGame);
    fireEvent.click(screen.getByTitle('End'));
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('closes modal when Return to Review is clicked', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    fireEvent.click(screen.getByText(/return to review/i));
    expect(screen.queryByText('White Wins')).not.toBeInTheDocument();
  });

  it('closes modal when overlay is clicked', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    fireEvent.click(screen.getByText('White Wins').closest('.result-modal-overlay'));
    expect(screen.queryByText('White Wins')).not.toBeInTheDocument();
  });

  it('shows result modal when navigating to last move via Next', () => {
    renderReviewPage(mockGame);
    const nextBtn = screen.getByTitle('Next');
    // click through all moves
    const totalMoves = 6; // 3 moves each side = 6 half moves
    for (let i = 0; i < totalMoves; i++) {
      if (!nextBtn.disabled) fireEvent.click(nextBtn);
    }
    expect(screen.getByText('White Wins')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Analysis text
// ---------------------------------------------------------------------------
describe('ReviewPage analysis text', () => {
  it('shows game result text at last move', () => {
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('End'));
    fireEvent.click(screen.getByText(/return to review/i));
    expect(screen.getByText(/white wins/i)).toBeInTheDocument();
  });

  it('shows engine recommendation text mid-game', () => {
  renderReviewPage(mockGame);
  fireEvent.click(screen.getByTitle('Next'));
  expect(screen.getByText(/use "show best move"/i)).toBeInTheDocument();
});
});