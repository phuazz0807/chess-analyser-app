import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, computeResult } from '../helpers';
import { analyzeAndWait } from '../api/analysis.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Per‑row analysis state container.
 *
 * Keys are game identifiers (url); values are:
 *   { isAnalyzing: bool, isAnalyzed: bool, error: string|null }
 */

/**
 * GamesTable — renders the list of games as a styled table.
 *
 * Includes an "Analyze" column whose button:
 *   1. Fires a POST to the backend /api/analysis/start
 *   2. Polls /api/analysis/status/{id} until done
 *   3. Swaps to "View Analysis" on completion
 */
export default function GamesTable({ games, username }) {
  const { user , token} = useAuth();
  const navigate = useNavigate();

  // Row‑level analysis state keyed by game url (unique per game).
  const [analysisState, setAnalysisState] = useState({});

  // Batch check which games are already analyzed on load
  useEffect(() => {
    if (!games || games.length === 0 || !token) return;

    const gameIds = games.map((g) => g.url).filter(Boolean);

    fetch('/api/analysis/status/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(gameIds),
    })
      .then((res) => res.json())
      .then((data) => {
        const initial = {};
        for (const [gameId, status] of Object.entries(data)) {
          initial[gameId] = {
            isAnalyzing: false,
            isAnalyzed: status === 'done',
            error: null,
          };
        }
        setAnalysisState(initial);
      })
      .catch((err) => console.error('Batch status check failed:', err));
  }, [games, token]);

  /**
   * Return the state object for a specific game, with sensible defaults.
   */
  const getRowState = useCallback(
    (gameUrl) =>
      analysisState[gameUrl] || { isAnalyzing: false, isAnalyzed: false, error: null },
    [analysisState],
  );

  /**
   * Merge a partial update into a single row's state.
   */
  const updateRow = useCallback((gameUrl, patch) => {
    setAnalysisState((prev) => ({
      ...prev,
      [gameUrl]: { ...(prev[gameUrl] || { isAnalyzing: false, isAnalyzed: false, error: null }), ...patch },
    }));
  }, []);

  /**
   * Handle the "Analyze" button click for a game row.
   *
   * Async flow:
   *   1. Set isAnalyzing=true, clear any previous error.
   *   2. Call analyzeAndWait() which starts analysis and polls until done.
   *   3. On success → isAnalyzing=false, isAnalyzed=true.
   *   4. On failure → isAnalyzing=false, show error toast inline.
   */
  const handleAnalyze = useCallback(
    async (game) => {
      const gameUrl = game.url;
        console.log(`Starting analysis for game ${gameUrl}`);
        console.log(JSON.stringify(game, null, 2));
        console.log(`Game ID: ${game.game_id}, PGN length: ${game.pgn ? game.pgn.length : 'N/A'}`);

      // Prevent duplicate clicks.
      const current = getRowState(gameUrl);
      if (current.isAnalyzing || current.isAnalyzed) return;

      updateRow(gameUrl, { isAnalyzing: true, error: null });

      try {
        // Use game URL as the unique ID and send PGN + default depth.
        await analyzeAndWait(gameUrl, game.pgn, 18, user.user_id,token);

        // Analysis complete — update button state.
        updateRow(gameUrl, { isAnalyzing: false, isAnalyzed: true });
        navigate('/review', { state: { game, username } });
      } catch (err) {
        // Analysis failed — re‑enable the button and show error.
        updateRow(gameUrl, { isAnalyzing: false, error: err.message || 'Analysis failed. Try again.' });
      }
    },
    [getRowState, updateRow,navigate, user, username,token],
  );

  if (!games || games.length === 0) return null;

  // function handleRowClick(game) {
  //   navigate('/review', { state: { game, username } });
  // }

  return (
    <div className="table-wrapper">
      <p className="game-count">{games.length} game{games.length !== 1 ? 's' : ''} found</p>
      <table className="games-table">
        <thead>
          <tr>
            <th>Game Mode</th>
            <th>Players</th>
            <th>Result</th>
            <th>Accuracy</th>
            <th>Game URL</th>
            <th>Date</th>
            <th>Analyze</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, game_id) => {
            const { label, className } = computeResult(game, username);
            const rowState = getRowState(game.url);

            return (
              <tr
                key={game.url || game_id}
                // onClick={() => handleRowClick(game)}
                className="games-table-row"
                style={{ cursor: 'pointer' }}
              >
                {/* Game Mode */}
                <td className="cell-mode">
                  {game.time_class || '—'}
                </td>

                {/* Players — stacked white / black with ratings */}
                <td className="cell-players">
                  <span className="player white-player">
                    &#9812; {game.white_username || '?'}
                    {game.white_rating != null && (
                      <span className="rating"> ({game.white_rating})</span>
                    )}
                  </span>
                  <span className="player black-player">
                    &#9818; {game.black_username || '?'}
                    {game.black_rating != null && (
                      <span className="rating"> ({game.black_rating})</span>
                    )}
                  </span>
                </td>

                {/* Result */}
                <td className={`cell-result ${className}`}>
                  {label}
                </td>

                {/* Accuracy — stacked */}
                <td className="cell-accuracy">
                  {game.accuracies ? (
                    <>
                      <span className="acc-line">
                        &#9812; {game.accuracies.white != null
                          ? `${game.accuracies.white.toFixed(1)}%`
                          : '—'}
                      </span>
                      <span className="acc-line">
                        &#9818; {game.accuracies.black != null
                          ? `${game.accuracies.black.toFixed(1)}%`
                          : '—'}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Game URL — stop propagation so clicking View doesn't also trigger row click */}
                <td className="cell-url" onClick={(e) => e.stopPropagation()}>
                  {game.url ? (
                    <a href={game.url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                  {/* <button
                    className="review-btn"
                    onClick={() => handleRowClick(game)}
                  >
                    Review
                  </button> */}
                </td>


                {/* Date */}
                <td className="cell-date">
                  {formatDate(game.end_time)}
                </td>

                {/* Analyze — per‑row button with loading / done / error states */}
                <td className="cell-analyze">
                  {rowState.isAnalyzed ? (
                    <button
                      className="analyze-btn analyze-btn--done"
                      onClick={() => navigate('/review', { state: { game, username } })}
                    >
                      Review
                    </button>
                  ) : (
                    <button
                      className="analyze-btn"
                      disabled={rowState.isAnalyzing || !game.pgn}
                      onClick={() => handleAnalyze(game)}
                    >
                      {rowState.isAnalyzing ? (
                        <span className="analyze-loading">
                          <span className="analyze-spinner" />
                        </span>
                      ) : 'Analyze'}
                    </button>
                  )}

                  {/* Inline error toast */}
                  {rowState.error && (
                    <span className="analyze-error" role="alert">{rowState.error}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}