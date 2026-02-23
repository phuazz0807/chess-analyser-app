import { formatDate, computeResult } from '../helpers';

/**
 * GamesTable — renders the list of games as a styled table.
 */
export default function GamesTable({ games, username }) {
  if (!games || games.length === 0) return null;

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
          </tr>
        </thead>
        <tbody>
          {games.map((game, idx) => {
            const { label, className } = computeResult(game, username);
            return (
              <tr key={game.url || idx}>
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

                {/* Game URL */}
                <td className="cell-url">
                  {game.url ? (
                    <a href={game.url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Date */}
                <td className="cell-date">
                  {formatDate(game.end_time)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
