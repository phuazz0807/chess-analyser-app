/**
 * Helper: convert a Unix timestamp (seconds) to a YYYY-MM-DD string.
 */
export function formatDate(unixTimestamp) {
  if (unixTimestamp == null) return '—';
  const d = new Date(unixTimestamp * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: get today's date as YYYY-MM-DD in local time.
 */
export function todayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determine the result label and CSS class for the queried user.
 *
 * Returns { label: 'Win' | 'Loss' | 'Draw', className: 'result-win' | ... }
 */
export function computeResult(game, username) {
  const lowerUser = username.toLowerCase();
  const whiteUser = (game.white_username || '').toLowerCase();
  const blackUser = (game.black_username || '').toLowerCase();

  let userResult = null;
  if (whiteUser === lowerUser) {
    userResult = game.white_result;
  } else if (blackUser === lowerUser) {
    userResult = game.black_result;
  }

  if (!userResult) return { label: '—', className: 'result-unknown' };

  const wins = new Set([
    'win',
  ]);
  const losses = new Set([
    'checkmated', 'timeout', 'resigned', 'lose', 'abandoned',
    'threecheck', 'kingofthehill', 'bughousepartnerlose',
  ]);
  // Everything else (stalemate, insufficient, agreed, repetition, etc.) is a draw.

  if (wins.has(userResult)) {
    return { label: 'Win', className: 'result-win' };
  }
  if (losses.has(userResult)) {
    return { label: 'Loss', className: 'result-loss' };
  }
  return { label: 'Draw', className: 'result-draw' };
}
