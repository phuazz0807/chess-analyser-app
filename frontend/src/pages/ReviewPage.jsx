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

// ---------------------------------------------------------------------------
// Comment pools per classification
// ---------------------------------------------------------------------------
const COMMENTS = {
  brilliant: [
    "Incredible! The engine couldn't have done better itself.",
    "A move worthy of a grandmaster. Perfectly calculated.",
    "You saw what others would miss. Truly special.",
    "The computer approves. That's no easy feat.",
    "A spark of genius in this position!",
    "Your opponent didn't see that coming — and neither did we!",
    "This is the kind of move that wins tournaments.",
    "Chess at its finest. You found the needle in a haystack.",
    "Brilliant intuition. The position rewards your creativity.",
    "A move that would make Kasparov nod in approval.",
    "You cracked the position open like a pro.",
    "That's not just good chess — that's art.",
    "The engine's top choice. You're thinking like a machine.",
    "Exceptional. Your opponent is in serious trouble now.",
    "One of those moves you'd want to show your friends.",
  ],
  best: [
    "Textbook precision. You found the strongest continuation.",
    "Exactly what the position called for. Well played.",
    "The engine agrees — you made the right call.",
    "Consistent, accurate play. Keep it up.",
    "No wasted moves. Pure efficiency.",
    "You read the position correctly and acted on it.",
    "Solid and strong. Your opponent has work to do.",
    "That's the kind of move that slowly suffocates your opponent.",
    "Perfect. The position is yours to control now.",
    "You're in the driver's seat. Best move on the board.",
    "Clinical and precise. Well calculated.",
    "The strongest move available — and you found it.",
    "Your instincts are sharp. The engine backs you up.",
    "Maximising your position with every move. Impressive.",
    "Clean and correct. Your opponent is under pressure.",
  ],
  excellent: [
    "Very strong play. You're in great shape here.",
    "Nearly perfect. The position rewards your decision.",
    "A high-quality move that keeps you firmly in control.",
    "Just a hair away from the absolute best — still outstanding.",
    "Your opponent has very little to work with now.",
    "Excellent judgement. You assessed the position well.",
    "A move that shows real understanding of the position.",
    "You're playing with confidence and it shows.",
    "Precise and purposeful. Great chess thinking.",
    "The position favours you. Keep applying the pressure.",
    "Strong continuation. Your opponent needs to be careful.",
    "You're dictating the flow of the game. Well done.",
    "A move that tightens your grip on the position.",
    "Excellent choice — your pieces are working beautifully.",
    "You're a step ahead. Keep the momentum going.",
  ],
  good: [
    "Solid choice. You kept the pressure on.",
    "A sound move that keeps your position healthy.",
    "Good thinking. The position remains in your favour.",
    "Not flashy, but effective. Chess is about results.",
    "You made a sensible decision under pressure.",
    "A practical move that gets the job done.",
    "Your position is stable and comfortable. Well played.",
    "Good moves don't always look exciting — but they win games.",
    "You kept things simple and that's often the smartest play.",
    "Steady and reliable. Your opponent can't complain either.",
    "A healthy choice that maintains the balance in your favour.",
    "Good chess is about consistency, and you're showing that.",
    "You didn't overcomplicate it. That takes discipline.",
    "Perfectly reasonable. Your position holds up well.",
    "A grounded move that keeps your game on track.",
  ],
  great: [
    "Sharp and purposeful. You targeted the right square.",
    "Great awareness of the position. Your opponent is uncomfortable.",
    "You found a strong move that creates real problems.",
    "Precise play — you're making your opponent think hard.",
    "A great move that improves your position meaningfully.",
    "Your pieces are coordinating beautifully after that.",
    "You spotted an opportunity and took it. Well done.",
    "Dynamic and energetic play. Keep the initiative.",
    "A move that shows tactical sharpness and positional sense.",
    "Great decision-making. The position rewards your choice.",
    "You're applying pressure in all the right places.",
    "Excellent piece activity after that move. Very strong.",
    "That move puts your opponent on the back foot.",
    "You've seized the initiative. Don't let it go.",
    "Smart and aggressive. Your opponent must tread carefully.",
  ],
  inaccuracy: [
    "Not the worst, but there was a stronger option available.",
    "A slight slip — the position is still manageable.",
    "You gave up a small edge there. Stay focused.",
    "The position is still okay, but you let some tension escape.",
    "A little imprecise — these small moments add up over a game.",
    "Your opponent gets a tiny foothold. Don't give them more.",
    "Not a disaster, but the engine found something better.",
    "You played it safe when you could have been bolder.",
    "A passive choice when the position called for activity.",
    "The position is still yours to play, but be more precise.",
    "Small inaccuracies can snowball. Tighten up from here.",
    "You missed a cleaner path, but recovery is still possible.",
    "The game is still close — refocus and keep pushing.",
    "A slight detour from the best plan. Course correct now.",
    "Not ideal, but you can still fight back from here.",
  ],
  mistake: [
    "This gives your opponent an opportunity. Stay sharp.",
    "A tougher move to recover from. Watch for these moments.",
    "Your opponent will be looking to exploit this. Be careful.",
    "The balance has shifted. You'll need to defend carefully now.",
    "A significant error — the engine sees a clear advantage for your opponent.",
    "This is the kind of move that turns games around. Learn from it.",
    "You gave away something important there. Regroup and focus.",
    "The position has become difficult. Accurate play is critical now.",
    "Your opponent has been handed an opportunity — don't give them more.",
    "A misjudgement. The position demanded more careful thinking.",
    "Tough moment. Take stock and find the most resilient defence.",
    "It's still playable, but you're fighting uphill from here.",
    "A costly decision. Every move from here needs to count.",
    "Your opponent will be smiling at this one. Time to dig in.",
    "These are the moves we learn the most from. Analyse this one carefully.",
  ],
  blunder: [
    "Ouch! This one hurts. The opponent can capitalise big here.",
    "A costly error. Take a breath and learn from this one.",
    "That's a tough one to come back from. Your opponent is in the driver's seat.",
    "The position has swung dramatically. Stay composed.",
    "A serious mistake — the engine sees a decisive advantage for your opponent.",
    "Even the best players blunder. What matters is what you learn.",
    "That changes everything. Your opponent won't miss this opportunity.",
    "A move you'll want to revisit in analysis. What did you miss?",
    "The game has slipped away here. Fight on and learn from it.",
    "Blunders happen to everyone — even Magnus. Analyse why.",
    "A painful moment. But every blunder teaches something valuable.",
    "The position is now lost. Keep playing and study this moment afterwards.",
    "Your opponent has a winning advantage. A tough lesson, but an important one.",
    "This is the kind of moment that defines resilience. Keep going.",
    "Don't dwell on it — finish the game with dignity and analyse later.",
  ],
  miss: [
    "You had a winning shot there and let it slip.",
    "The opportunity was there — it just wasn't taken.",
    "Your opponent got lucky. You missed something big.",
    "A chance to seize control slipped through your fingers.",
    "The position offered you more than you took. Missed opportunity.",
    "Your opponent will breathe a sigh of relief after that.",
    "You had the advantage but didn't press it. Stay alert for chances.",
    "Sometimes the hardest moves to find are the ones that win immediately.",
    "A missed tactical opportunity. Train your pattern recognition.",
    "The game could have ended differently. Study what you missed.",
    "You let your opponent off the hook. Don't give second chances.",
    "Spotting these moments consistently is what separates levels.",
    "The winning move was there — keep sharpening your tactical eye.",
    "Your opponent survives, but learn what you could have played.",
    "Missing key moments is normal early on. Tactics training will help.",
  ],
};

const EXPRESSION_MAP = {
  brilliant: 'excited',
  best: 'excited',
  excellent: 'happy',
  great: 'happy',
  good: 'happy',
  inaccuracy: 'concerned',
  miss: 'concerned',
  mistake: 'shocked',
  blunder: 'shocked',
};

const CLASSIFICATION_EMOJI = {
  best: '✅ Best',
  excellent: '✅ Excellent',
  good: '🟢 Good',
  inaccuracy: '⚠️ Inaccuracy',
  mistake: '❓ Mistake',
  blunder: '❗ Blunder',
  miss: '❌ Miss',
  brilliant: '✨ Brilliant',
  great: '🎯 Great',
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// SVG Coach Character
// ---------------------------------------------------------------------------
function CoachCharacter({ expression }) {
  const skinColor = '#F5C98A';
  const hairColor = '#3b2a1a';
  const shirtColor = '#2d6a4f';
  const expr = expression || 'neutral';
  const baseEyes = (
  <>
    <ellipse cx="30" cy="50" rx="4" ry="4.5" fill={hairColor}/>
    <ellipse cx="50" cy="50" rx="4" ry="4.5" fill={hairColor}/>
    <ellipse cx="31" cy="49" rx="1.5" ry="1.5" fill="white"/>
    <ellipse cx="51" cy="49" rx="1.5" ry="1.5" fill="white"/>
  </>
  );
  const eyes = {
    happy: (
      <>
        {/* slightly lifted / attentive eyes */}
    <ellipse cx="30" cy="49" rx="4" ry="4.5" fill={hairColor}/>
    <ellipse cx="50" cy="49" rx="4" ry="4.5" fill={hairColor}/>

    {/* highlights shifted up → “paying attention” */}
    <ellipse cx="31" cy="47.5" rx="1.5" ry="1.5" fill="white"/>
    <ellipse cx="51" cy="47.5" rx="1.5" ry="1.5" fill="white"/>
      </>
    ),
    excited: (
      <>
        {baseEyes}
        <path d="M25 49 Q30 45 35 49" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M45 49 Q50 45 55 49" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>
    ),
    neutral: (
      <>
        <ellipse cx="30" cy="50" rx="4" ry="4.5" fill={hairColor}/>
        <ellipse cx="50" cy="50" rx="4" ry="4.5" fill={hairColor}/>
        <ellipse cx="31" cy="49" rx="1.5" ry="1.5" fill="white"/>
        <ellipse cx="51" cy="49" rx="1.5" ry="1.5" fill="white"/>
      </>
    ),
    concerned: (
      <>
        <ellipse cx="30" cy="50" rx="4" ry="4.5" fill={hairColor}/>
        <ellipse cx="50" cy="50" rx="4" ry="4.5" fill={hairColor}/>
        <ellipse cx="31" cy="49" rx="1.5" ry="1.5" fill="white"/>
        <ellipse cx="51" cy="49" rx="1.5" ry="1.5" fill="white"/>
      </>
    ),
    shocked: (
      <>
        <ellipse cx="30" cy="50" rx="5.5" ry="6" fill="white" stroke={hairColor} strokeWidth="1.5"/>
        <ellipse cx="50" cy="50" rx="5.5" ry="6" fill="white" stroke={hairColor} strokeWidth="1.5"/>
        <ellipse cx="30" cy="51" rx="3" ry="3.5" fill={hairColor}/>
        <ellipse cx="50" cy="51" rx="3" ry="3.5" fill={hairColor}/>
        <ellipse cx="31" cy="50" rx="1" ry="1" fill="white"/>
        <ellipse cx="51" cy="50" rx="1" ry="1" fill="white"/>
      </>
    ),
  };

  const mouth = {
    happy: 
   <path
    d="M34 64 Q40 66.5 46 64"
    stroke={hairColor}
    strokeWidth="2.5"
    fill="none"
    strokeLinecap="round"
  />, excited: <path d="M28 62 Q40 70 52 62" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>,
    neutral: <path d="M30 64 Q40 66 50 64" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>,
    concerned: <path d="M30 66 Q40 62 50 66" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>,
    shocked: <ellipse cx="40" cy="67" rx="6" ry="8" fill={hairColor}/>,
  };

  const brows = {
    excited: (
      <>
        <path d="M24 40 Q30 36 36 40" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M44 40 Q50 36 56 40" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </>
    ),
    happy: (
      <>
        <path d="M24 42 Q30 38 36 42" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M44 42 Q50 38 56 42" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>
    ),
    neutral: (
      <>
        <path d="M24 43 Q30 41 36 43" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M44 43 Q50 41 56 43" stroke={hairColor} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>
    ),
    concerned: (
      <>
        <path d="M24 43 Q30 39 36 42" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M44 42 Q50 39 56 43" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </>
    ),
    shocked: (
      <>
        <path d="M24 38 Q30 34 36 38" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M44 38 Q50 34 56 38" stroke={hairColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </>
    ),
  };

  return (
    <svg viewBox="0 0 80 120" width="68" height="102" xmlns="http://www.w3.org/2000/svg" className="coach-svg">
      <ellipse cx="40" cy="105" rx="26" ry="18" fill={shirtColor}/>
      <rect x="34" y="82" width="12" height="12" fill={skinColor}/>
      <ellipse cx="40" cy="55" rx="26" ry="30" fill={skinColor}/>
      <ellipse cx="40" cy="27" rx="26" ry="14" fill={hairColor}/>
      <rect x="14" y="27" width="52" height="10" fill={hairColor}/>
      <ellipse cx="14" cy="55" rx="5" ry="7" fill={skinColor}/>
      <ellipse cx="66" cy="55" rx="5" ry="7" fill={skinColor}/>
      {brows[expr]}
      {eyes[expr]}
      <ellipse cx="40" cy="58" rx="3" ry="2" fill="#e8b57a"/>
      {mouth[expr]}
      <rect x="21" y="44" width="16" height="12" rx="4" fill="none" stroke="#555" strokeWidth="1.8"/>
      <rect x="43" y="44" width="16" height="12" rx="4" fill="none" stroke="#555" strokeWidth="1.8"/>
      <path d="M37 50 L43 50" stroke="#555" strokeWidth="1.8"/>
      <path d="M21 50 L16 48" stroke="#555" strokeWidth="1.8"/>
      <path d="M59 50 L64 48" stroke="#555" strokeWidth="1.8"/>
      <path d="M30 90 L40 100 L50 90" fill="white" stroke={shirtColor} strokeWidth="1"/>
      <path d="M24 95 Q40 108 56 95" fill={shirtColor}/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Coach Panel
// ---------------------------------------------------------------------------
function CoachPanel({ classification, comment }) {
  const expression = EXPRESSION_MAP[classification] || 'neutral';
  const emoji = classification ? (CLASSIFICATION_EMOJI[classification] || classification) : null;

  return (
    <div className="coach-panel">
      <div className="coach-character-wrap">
        <CoachCharacter expression={expression} />
      </div>
      <div className="coach-content">
        {emoji && <span className="coach-classification">{emoji}</span>}
        <div className="coach-bubble">
          <div className="coach-bubble-tail" />
          <p className="coach-bubble-text">{comment}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
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

function EvalBar({ eval: rawEval, boardSize }) {
  const clampedEval = Math.max(-1000, Math.min(1000, rawEval ?? 0));
  const whitePercent = ((clampedEval + 1000) / 2000) * 100;
  return (
    <div className="eval-bar" style={{ height: boardSize }}>
      <div className="eval-bar-black" style={{ height: `${100 - whitePercent}%` }} />
      <div className="eval-bar-white" style={{ height: `${whitePercent}%` }} />
    </div>
  );
}

function ResultModal({ game, onClose }) {
  const result = getGameResult(game);
  if (!result) return null;
// Fire-and-forget: mark the review as done when the modal mounts
  useEffect(() => {
    if (!game.url) return;
    const token = localStorage.getItem('chess_analyser_token');
 
    fetch('/api/game-history/complete', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ game_id: game.url }),
    }).catch(() => {});
  }, [game.url]);

  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal" onClick={(e) => e.stopPropagation()}>
        <p className="result-modal-title">{result.label}</p>
        {result.method && <p className="result-modal-method">by {result.method}</p>}
        {result.winner && <p className="result-modal-username">{result.winner}</p>}
        <button className="result-modal-btn" onClick={onClose}>Return to Review</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ReviewPage() {
  const location = useLocation();
  const game = location.state?.game || PLACEHOLDER_GAME;

  const fens  = useMemo(() => buildMoveHistory(game.pgn), [game.pgn]);
  const moves = useMemo(() => getMoveLabels(game.pgn), [game.pgn]);

  const [moveIndex, setMoveIndex]       = useState(0);
  const [showBestMove, setShowBestMove] = useState(false);
  const [boardSize, setBoardSize]       = useState(480);
  const [showResult, setShowResult]     = useState(false);
  const [analysisData, setAnalysisData] = useState([]);
  const [coachComment, setCoachComment] = useState('Navigate through the game using the buttons below.');

  const boardAreaRef = useRef(null);

  useEffect(() => {
    function updateSize() {
      if (!boardAreaRef.current) return;
      const area = boardAreaRef.current;
      const padding = 80;
      const barWidth = 48 + 6;
      const available = Math.min(area.clientWidth - barWidth, area.clientHeight - padding);
      setBoardSize(Math.max(280, available));
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!game.url) return;
    const token = localStorage.getItem('chess_analyser_token');
    fetch(`/api/analysis/${encodeURIComponent(game.url)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setAnalysisData(data.moves); })
      .catch(() => {});
  }, [game.url]);

  useEffect(() => {
  if (!game.url) return;
  const token = localStorage.getItem('chess_analyser_token');
 
  fetch('/api/game-history/upsert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      game_id:        game.url,
      game_url:       game.url,
      pgn:            game.pgn            ?? null,
      time_control:   game.time_control   ?? null,
      white_username: game.white_username ?? null,
      black_username: game.black_username ?? null,
      white_rating:   game.white_rating   ?? null,
      black_rating:   game.black_rating   ?? null,
      white_result:   game.white_result   ?? null,
      black_result:   game.black_result   ?? null,
      white_accuracy: game.accuracies?.white ?? null,
      black_accuracy: game.accuracies?.black ?? null,
      white_acpl:     null,
      black_acpl:     null,
    }),
  }).catch(() => {});
}, [game.url]);

  const currentMoveData = useMemo(() => {
    if (moveIndex === 0) return null;
    return analysisData.find(m => m.move_number === moveIndex) || null;
  }, [moveIndex, analysisData]);

  // Pick a random comment whenever move or classification changes
  useEffect(() => {
    if (moveIndex === 0) {
      setCoachComment('Navigate through the game using the buttons below.');
      return;
    }
    if (!currentMoveData) {
      setCoachComment('No analysis available for this move.');
      return;
    }
    const pool = COMMENTS[currentMoveData.classification];
    setCoachComment(pool ? pickRandom(pool) : 'Keep playing and reviewing to improve!');
  }, [moveIndex, currentMoveData]);

  const currentFen = String(fens[moveIndex]);

  const currentMoveLabel = moveIndex === 0
    ? 'Starting Position'
    : (() => {
        const m = moves[moveIndex - 1];
        const moveNum = Math.ceil(moveIndex / 2);
        const side = moveIndex % 2 === 1 ? '.' : '...';
        return `${moveNum}${side} ${m.san}`;
      })();

  const goBack    = () => { setMoveIndex(i => Math.max(0, i - 1)); setShowBestMove(false); };
  const goForward = () => {
    const next = Math.min(fens.length - 1, moveIndex + 1);
    setMoveIndex(next);
    setShowBestMove(false);
    if (next === fens.length - 1) setShowResult(true);
  };
  const goStart = () => { setMoveIndex(0); setShowBestMove(false); };
  const goEnd   = () => { setMoveIndex(fens.length - 1); setShowBestMove(false); setShowResult(true); };

  const bestMoveArrows = useMemo(() => {
    if (!showBestMove || moveIndex === 0) return [];
    const moveData = analysisData.find(m => m.move_number === moveIndex);
    if (!moveData?.best_move || moveData.best_move.length < 4) return [];
    return [[moveData.best_move.slice(0, 2), moveData.best_move.slice(2, 4), 'rgba(0, 200, 100, 0.8)']];
  }, [showBestMove, moveIndex, analysisData]);

  const isLastMove = moveIndex === fens.length - 1 && getGameResult(game);
  const classification = currentMoveData?.classification || null;

  return (
    <div className="review-page">


      <div className="review-board-area" ref={boardAreaRef}>

        <div className="review-player">
          <span className="review-player-avatar review-player-avatar--black">♟</span>
          <span className="review-player-name">{game.black_username}</span>
          <span className="review-player-elo">{game.black_rating}</span>
        </div>
        <div className="review-board-wrapper">
          <EvalBar eval={moveIndex === 0 ? 0 : currentMoveData?.played_eval} boardSize={boardSize} />
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
        </div>
        <div className="review-player">
          <span className="review-player-avatar review-player-avatar--white">♙</span>
          <span className="review-player-name">{game.white_username}</span>
          <span className="review-player-elo">{game.white_rating}</span>
        </div>
      </div>


      <aside className="review-panel">

        <div className="review-panel-analysis">

          <div className="review-panel-analysis-header">
            <span className="review-panel-analysis-title">Analysis</span>
          </div>
          <div className="review-panel-analysis-body">
            {isLastMove ? (
              <p className="review-panel-analysis-text">
                {`🏁 ${getGameResult(game).label}${getGameResult(game).winner ? ` — ${getGameResult(game).winner}` : ''}`}
              </p>
            ) : (
              <CoachPanel classification={classification} comment={coachComment} />
            )}
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