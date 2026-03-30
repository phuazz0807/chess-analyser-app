/**
 * Tests for pages/ReviewPage.jsx
 * Covers: rendering, player info, move navigation, move list click,
 *         show best move toggle, result modal, analysis text
 */
/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReviewPage from '../../pages/ReviewPage';
// Mock Chessboard — expose customArrows as data attribute for assertions
vi.mock('react-chessboard', () => ({
  Chessboard: ({ position, customArrows }) => (
    <div
      data-testid="chessboard"
      data-position={position}
      data-arrows={JSON.stringify(customArrows)}
    />
  ),
}));

vi.mock('../../pages/ReviewPage.css', () => ({}));

const mockAnalysisData = {
  game_id: 'https://www.chess.com/game/live/123456789',
  moves: [
    { move_number: 1, fen_before: '', played_move: 'e2e4', played_eval: 114, centipawn_loss: 0, classification: 'best', best_move: 'e2e4', best_eval: 114, analysis_depth: 18 },
    { move_number: 2, fen_before: '', played_move: 'e7e5', played_eval: -26, centipawn_loss: 59, classification: 'inaccuracy', best_move: 'c7c5', best_eval: 33, analysis_depth: 18 },
    { move_number: 3, fen_before: '', played_move: 'g1f3', played_eval: -31, centipawn_loss: 5, classification: 'good', best_move: 'g1f3', best_eval: -31, analysis_depth: 18 },
    { move_number: 4, fen_before: '', played_move: 'b8c6', played_eval: 33, centipawn_loss: 0, classification: 'best', best_move: 'b8c6', best_eval: 33, analysis_depth: 18 },
    { move_number: 5, fen_before: '', played_move: 'f1b5', played_eval: -31, centipawn_loss: 0, classification: 'best', best_move: 'f1b5', best_eval: -31, analysis_depth: 18 },
    { move_number: 6, fen_before: '', played_move: 'a7a6', played_eval: 330, centipawn_loss: 59, classification: 'inaccuracy', best_move: 'g8f6', best_eval: -26, analysis_depth: 18 },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockAnalysisData,
  });
  localStorage.setItem('chess_analyser_token', 'test-token');
});

const mockGame = {
  url: 'https://www.chess.com/game/live/123456789',
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

  it('shows no analysis available text mid-game when no data', () => {
  renderReviewPage(mockGame);
  fireEvent.click(screen.getByTitle('Next'));
  expect(screen.getByText(/no analysis available/i)).toBeInTheDocument();
});
});
// ---------------------------------------------------------------------------
// Eval bar
// ---------------------------------------------------------------------------
describe('ReviewPage eval bar', () => {
  it('renders eval bar', () => {
    renderReviewPage(mockGame);
    expect(document.querySelector('.eval-bar')).toBeInTheDocument();
  });

  it('renders eval bar black and white sections', () => {
    renderReviewPage(mockGame);
    expect(document.querySelector('.eval-bar-black')).toBeInTheDocument();
    expect(document.querySelector('.eval-bar-white')).toBeInTheDocument();
  });

  it('starts at 50/50 at move 0', () => {
    renderReviewPage(mockGame);
    const whiteBar = document.querySelector('.eval-bar-white');
    expect(whiteBar.style.height).toBe('50%');
  });

  it('eval bar percent stays within 0-100 range', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => {
      const whiteBar = document.querySelector('.eval-bar-white');
      const percent = parseFloat(whiteBar.style.height);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    });
  });
});

// ---------------------------------------------------------------------------
// Analysis fetch
// ---------------------------------------------------------------------------
describe('ReviewPage analysis data fetch', () => {
  it('fetches analysis data on mount when game has url', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analysis/'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });
  });

  it('does not fetch when game has no url', () => {
    const gameWithoutUrl = { ...mockGame, url: null };
    renderReviewPage(gameWithoutUrl);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles fetch failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    renderReviewPage(mockGame);
    await waitFor(() => {
      expect(screen.getByText(/navigate through the game/i)).toBeInTheDocument();
    });
  });

  it('handles non-ok response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    renderReviewPage(mockGame);
    await waitFor(() => {
      expect(screen.getByText(/navigate through the game/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Analysis panel — classification display
// ---------------------------------------------------------------------------
describe('ReviewPage classification display', () => {
  it('shows classification after navigating to a move with analysis', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => {
      expect(screen.getByText(/classification/i)).toBeInTheDocument();
    });
  });

  it('shows best emoji for best move', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => {
      expect(screen.getByText(/✅ Best/)).toBeInTheDocument();
    });
  });

  it('shows inaccuracy emoji for inaccuracy move', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => {
      expect(screen.getByText(/⚠️ Inaccuracy/)).toBeInTheDocument();
    });
  });

  it('shows no analysis available when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    renderReviewPage(mockGame);
    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => {
      expect(screen.getByText(/no analysis available/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Best move arrow
// ---------------------------------------------------------------------------
describe('ReviewPage best move arrow', () => {
  it('shows no arrows initially', () => {
    renderReviewPage(mockGame);
    const board = screen.getByTestId('chessboard');
    expect(JSON.parse(board.dataset.arrows)).toEqual([]);
  });

  it('shows arrow when show best move is clicked with analysis data', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    fireEvent.click(screen.getByRole('button', { name: /show best move/i }));
    await waitFor(() => {
      const arrows = JSON.parse(screen.getByTestId('chessboard').dataset.arrows);
      expect(arrows.length).toBe(1);
    });
  });

  it('parses UCI notation correctly — from and to squares', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    fireEvent.click(screen.getByRole('button', { name: /show best move/i }));
    await waitFor(() => {
      const arrows = JSON.parse(screen.getByTestId('chessboard').dataset.arrows);
      expect(arrows[0][0]).toBe('e2');
      expect(arrows[0][1]).toBe('e4');
    });
  });

  it('clears arrow when navigating to next move', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle('Next'));
    fireEvent.click(screen.getByRole('button', { name: /show best move/i }));
    fireEvent.click(screen.getByTitle('Next'));
    const arrows = JSON.parse(screen.getByTestId('chessboard').dataset.arrows);
    expect(arrows).toEqual([]);
  });

  it('shows no arrow at move 0 even when show best move is active', async () => {
    renderReviewPage(mockGame);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /show best move/i }));
    const arrows = JSON.parse(screen.getByTestId('chessboard').dataset.arrows);
    expect(arrows).toEqual([]);
  });
});