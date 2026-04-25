/**
 * Analysis API service — communicates with the backend analysis endpoints.
 *
 * Flow:
 *   1. startAnalysis()  → POST /api/analysis/start   → returns immediately (HTTP 202)
 *   2. pollStatus()     → GET  /api/analysis/status/{game_id} → "pending" | "done" | "error"
 *   3. getResult()      → GET  /api/analysis/result/{game_id} → full AnalysisResponse
 *
 * The frontend calls startAnalysis, then polls pollStatus at intervals until
 * the status flips to "done" or "error".
 */

const API_BASE = `${import.meta.env.VITE_API_URL}/api/analysis`;

/**
 * Kick off Stockfish analysis for a game.
 *
 * The backend forwards the request to the Stockfish microservice in the
 * background and returns HTTP 202 immediately.
 *
 * @param {string} userId   — current user's ID
 * @param {string} gameId   — unique game identifier
 * @param {string} pgn      — full PGN string
 * @param {number} depth    — analysis depth (10–25, default 18)
 * @returns {Promise<{message: string, game_id: string}>}
 */
export async function startAnalysis(userId, gameId, pgn, depth = 18,token) {
  const response = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      user_id: userId,
      game_id: gameId,
      pgn,
      analysis_depth: depth,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to start analysis');
  }

  return data;
}

/**
 * Poll the analysis status for a game.
 *
 * @param {string} gameId
 * @returns {Promise<{game_id: string, status: 'pending'|'done'|'error', error: string|null}>}
 */
export async function pollStatus(gameId,userId,token) {
  const response = await fetch(`${API_BASE}/status/${userId}/${encodeURIComponent(gameId)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 404) {
    return { status: 'pending' };
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to check analysis status');
  }

  return data;
}

/**
 * Retrieve the completed analysis result.
 *
 * @param {string} gameId
 * @returns {Promise<object>} — AnalysisResponse payload
 */
export async function getResult(gameId) {
  const response = await fetch(`${API_BASE}/result/${encodeURIComponent(gameId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to retrieve analysis result');
  }

  return data;
}

/**
 * Helper — starts analysis then polls until completion or failure.
 *
 * Returns the final status object with { status, game_id, error? }.
 * Throws on network errors or if maximum retries exceeded.
 *
 * @param {string}  gameId
 * @param {string}  pgn
 * @param {number}  depth
 * @param {number}  intervalMs   — polling interval (default 3 s)
 * @param {number}  maxRetries   — max poll attempts before giving up (default 100 ≈ 5 min)
 * @param {AbortSignal} [signal] — optional AbortSignal to cancel polling
 * @returns {Promise<{game_id: string, status: string, error?: string}>}
 */
export async function analyzeAndWait(
  gameId,
  pgn,
  depth = 18,
  userId,
  token,
  intervalMs = 3000,
  maxRetries = 500,
  signal = undefined,
) {
  // 1. Trigger the analysis.
  await startAnalysis(userId, gameId, pgn, depth,token);

  // 2. Poll until done / error / timeout.
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Respect cancellation.
    if (signal?.aborted) {
      throw new Error('Analysis polling was cancelled');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const statusResp = await pollStatus(gameId,userId,token);

    if (statusResp.status === 'done') {
      return statusResp;
    }

    if (statusResp.status === 'error') {
      throw new Error(statusResp.error || 'Analysis failed on the server');
    }

    // Still pending — continue polling.
  }

  throw new Error('Analysis timed out — please try again later');
}
