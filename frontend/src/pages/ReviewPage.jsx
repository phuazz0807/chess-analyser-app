/**
 * ReviewPage — chess game review page.
 * Layout mirrors chess.com's analysis view.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ReviewPage.css';

const PLACEHOLDER_GAME = {
  white_username: 'hikaru',
  white_rating: 3000,
  black_username: 'magnuscarlsen',
  black_rating: 2850,
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7',
  time_class: 'blitz',
};

const LIGHT_SQUARE = '#eeeed2';
const DARK_SQUARE  = '#769656';

function buildMoveHistory(pgn) {
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch { return [new Chess().fen()]; }
  const moves = chess.history();
  const history = [];
  const temp = new Chess();
  history.push(temp.fen());
  for (const move of moves) {
    const result = temp.move(move);
    if (!result) break;
    history.push(temp.fen());
  }
  return history;
}

function getMoveLabels(pgn) {
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch { return []; }
  return chess.history({ verbose: true });
}

function getGameResult(game) {
  const methodMap = {
    checkmated: 'Checkmate',
    resigned: 'Resignation',
    timeout: 'Timeout',
    abandoned: 'Abandonment',
    agreed: 'Agreement',
    stalemate: 'Stalemate',
    repetition: 'Repetition',
    insufficient: 'Insufficient Material',
    timevsinsufficient: 'Insufficient Material',
  };

  if (game.white_result === 'win') {
    const method = methodMap[game.black_result] || '';
    return { label: 'White Wins', method, winner: game.white_username };
  }
  if (game.black_result === 'win') {
    const method = methodMap[game.white_result] || '';
    return { label: 'Black Wins', method, winner: game.black_username };
  }
  if (['agreed', 'stalemate', 'repetition', 'insufficient', 'timevsinsufficient'].includes(game.white_result)) {
    const method = methodMap[game.white_result] || '';
    return { label: 'Draw', method, winner: null };
  }
  return null;
}

function ResultModal({ game, onClose }) {
  const result = getGameResult(game);
  if (!result) return null;

  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal" onClick={(e) => e.stopPropagation()}>
        <p className="result-modal-title">{result.label}</p>
        {result.method && <p className="result-modal-method">by {result.method}</p>}
        {result.winner && <p className="result-modal-username">{result.winner}</p>}
        <button className="result-modal-btn" onClick={onClose}>
          Return to Review
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const location = useLocation();
  const game = location.state?.game || PLACEHOLDER_GAME;

  const fens  = useMemo(() => buildMoveHistory(game.pgn), [game.pgn]);
  const moves = useMemo(() => getMoveLabels(game.pgn), [game.pgn]);

  const [moveIndex, setMoveIndex]     = useState(0);
  const [showBestMove, setShowBestMove] = useState(false);
  const [boardSize, setBoardSize]     = useState(480);
  const [showResult, setShowResult]   = useState(false);

  const boardAreaRef = useRef(null);

  useEffect(() => {
    function updateSize() {
      if (!boardAreaRef.current) return;
      const area = boardAreaRef.current;
      const padding = 80;
      const available = Math.min(area.clientWidth, area.clientHeight - padding);
      setBoardSize(Math.max(280, available));
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const currentFen = String(fens[moveIndex]);

  const currentMoveLabel = moveIndex === 0
    ? 'Starting Position'
    : (() => {
        const m = moves[moveIndex - 1];
        const moveNum = Math.ceil(moveIndex / 2);
        const side = moveIndex % 2 === 1 ? '.' : '...';
        return `${moveNum}${side} ${m.san}`;
      })();

  const goBack = () => {
    setMoveIndex(i => Math.max(0, i - 1));
    setShowBestMove(false);
  };

  const goForward = () => {
    const next = Math.min(fens.length - 1, moveIndex + 1);
    setMoveIndex(next);
    setShowBestMove(false);
    if (next === fens.length - 1) setShowResult(true);
  };

  const goStart = () => {
    setMoveIndex(0);
    setShowBestMove(false);
  };

  const goEnd = () => {
    setMoveIndex(fens.length - 1);
    setShowBestMove(false);
    setShowResult(true);
  };

  const bestMoveArrows = showBestMove
    ? [{ from: 'e2', to: 'e4', color: 'rgba(0, 200, 100, 0.8)' }]
    : [];

  const analysisText = moveIndex === fens.length - 1 && getGameResult(game)
    ? `🏁 ${getGameResult(game).label}${getGameResult(game).winner ? ` — ${getGameResult(game).winner}` : ''}`
    : showBestMove
    ? '✦ Best move shown — engine\'s top recommendation for this position.'
    : moveIndex === 0
    ? 'Navigate through the game using the buttons below.'
    : 'Use "Show Best Move" to see the engine\'s recommendation.';

  return (
    <div className="review-page">

      {/* ── Left: board + players ── */}
      <div className="review-board-area" ref={boardAreaRef}>

        <div className="review-player">
          <span className="review-player-avatar review-player-avatar--black">♟</span>
          <span className="review-player-name">{game.black_username}</span>
          <span className="review-player-elo">{game.black_rating}</span>
        </div>

        <div className="review-board">
          <Chessboard
            position={currentFen}
            arePiecesDraggable={false}
            customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
            customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
            customBoardStyle={{ borderRadius: '2px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
            customArrows={bestMoveArrows}
            boardWidth={boardSize}
          />
        </div>

        <div className="review-player">
          <span className="review-player-avatar review-player-avatar--white">♙</span>
          <span className="review-player-name">{game.white_username}</span>
          <span className="review-player-elo">{game.white_rating}</span>
        </div>
      </div>

      {/* ── Right: review panel ── */}
      <aside className="review-panel">

        <div className="review-panel-analysis">
          <div className="review-panel-analysis-header">
            <span className="review-panel-analysis-title">Analysis</span>
          </div>
          <div className="review-panel-analysis-body">
            <p className="review-panel-analysis-text">{analysisText}</p>
          </div>
        </div>

        <div className="review-panel-moves">
          <div className="review-panel-moves-header">Moves</div>
          <div className="review-panel-moves-list">
            {moves.reduce((rows, move, idx) => {
              if (idx % 2 === 0) {
                rows.push({ num: Math.floor(idx / 2) + 1, white: move, black: moves[idx + 1] });
              }
              return rows;
            }, []).map((row) => (
              <div key={row.num} className="review-move-row">
                <span className="review-move-num">{row.num}.</span>
                <span
                  className={`review-move-san ${moveIndex === row.num * 2 - 1 ? 'review-move-san--active' : ''}`}
                  onClick={() => setMoveIndex(row.num * 2 - 1)}
                >
                  {row.white?.san}
                </span>
                {row.black && (
                  <span
                    className={`review-move-san ${moveIndex === row.num * 2 ? 'review-move-san--active' : ''}`}
                    onClick={() => setMoveIndex(row.num * 2)}
                  >
                    {row.black?.san}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="review-panel-current">
          <span className="review-panel-current-label">{currentMoveLabel}</span>
          <button
            className={`review-best-move-btn ${showBestMove ? 'review-best-move-btn--active' : ''}`}
            onClick={() => setShowBestMove(v => !v)}
          >
            {showBestMove ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Back to game
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Show best move
              </>
            )}
          </button>
        </div>

        <div className="review-panel-nav">
          <button className="review-nav-btn" onClick={goStart} disabled={moveIndex === 0} title="Start">⏮</button>
          <button className="review-nav-btn" onClick={goBack}  disabled={moveIndex === 0} title="Previous">‹</button>
          <button className="review-nav-btn" onClick={goForward} disabled={moveIndex === fens.length - 1} title="Next">›</button>
          <button className="review-nav-btn" onClick={goEnd} disabled={moveIndex === fens.length - 1} title="End">⏭</button>
        </div>

      </aside>

      {showResult && <ResultModal game={game} onClose={() => setShowResult(false)} />}

    </div>
  );
}