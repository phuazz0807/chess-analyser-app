import { useState, useCallback } from 'react';
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
  const { user } = useAuth();
  const navigate = useNavigate();

  // Row‑level analysis state keyed by game url (unique per game).
  const [analysisState, setAnalysisState] = useState({});

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
      console.log(`Game ID: ${game.idx}, PGN length: ${game.pgn ? game.pgn.length : 'N/A'}`);

      // Prevent duplicate clicks.
      const current = getRowState(gameUrl);
      if (current.isAnalyzing || current.isAnalyzed) return;

      updateRow(gameUrl, { isAnalyzing: true, error: null });

      try {
        // Use game URL as the unique ID and send PGN + default depth.
        await analyzeAndWait(gameUrl, game.pgn, 18, user.user_id);

        // Analysis complete — update button state.
        updateRow(gameUrl, { isAnalyzing: false, isAnalyzed: true });
        navigate('/review', { state: { game, username } });
      } catch (err) {
        // Analysis failed — re‑enable the button and show error.
        updateRow(gameUrl, { isAnalyzing: false, error: err.message || 'Analysis failed. Try again.' });
      }
    },
    [getRowState, updateRow,navigate, user, username],
  );

  if (!games || games.length === 0) return null;

  function handleRowClick(game) {
    navigate('/review', { state: { game, username } });
  }

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
          {games.map((game, idx) => {
            const { label, className } = computeResult(game, username);
            const rowState = getRowState(game.url);

            return (
              <tr
                key={game.url || idx}
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
                  <button
                    className="review-btn"
                    onClick={() => handleRowClick(game)}
                  >
                    Review
                  </button>
                </td>


                {/* Date */}
                <td className="cell-date">
                  {formatDate(game.end_time)}
                </td>

                {/* Analyze — per‑row button with loading / done / error states */}
                <td className="cell-analyze">
                  {rowState.isAnalyzed ? (
                    /* Analysis complete → navigate to results page */
                    <button
                      className="analyze-btn analyze-btn--done"
                      onClick={() => navigate(`/analysis/${encodeURIComponent(game.url)}`)}
                    >
                      View Analysis
                    </button>
                  ) : (
                    <button
                      className="analyze-btn"
                      disabled={rowState.isAnalyzing || !game.pgn}
                      onClick={() => handleAnalyze(game)}
                    >
                      {rowState.isAnalyzing ? (
                        /* Inline spinner while analysis is running */
                        <span className="analyze-loading">
                          <span className="analyze-spinner" />
                          {/* Analyzing... */}
                        </span>
                      ) : (
                        'Analyze'
                      )}
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