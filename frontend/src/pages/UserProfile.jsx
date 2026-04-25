/**
 * UserProfile — displays the current user's profile information
 * and their reviewed games history.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';
import './UserProfile.css';

const CHESS_PIECES = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];

function FloatingPieces() {
  const pieces = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  piece: CHESS_PIECES[i % CHESS_PIECES.length],
  left: `${10 + i * 15}%`,              // evenly spread: 10, 25, 40, 55, 70, 85%
  animDuration: `${10 + (i % 4) * 4}s`, // 2x faster (was 30 + ...)
  animDelay: `${-(i * 2.3)}s`,
  size: `${8 + (i % 4) * 2}rem`,
  opacity: 0.06 + (i % 3) * 0.02,
}));

  return (
    <div className="floating-pieces" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="floating-piece"
          style={{
            left: p.left,
            fontSize: p.size,
            opacity: p.opacity,
            animationDuration: p.animDuration,
            animationDelay: p.animDelay,
          }}
        >
          {p.piece}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const isDone = status === 'done';
  return (
    <span className={`status-badge ${isDone ? 'status-badge--done' : 'status-badge--progress'}`}>
      {isDone ? '✓ Complete' : '⏳ In Progress'}
    </span>
  );
}

export default function UserProfile() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]     = useState(null);
  const [games, setGames]         = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingGames, setLoadingGames]     = useState(true);
  const [error, setError]         = useState('');
  const [gamesError, setGamesError] = useState('');

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res  = await fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) { setError(data.detail || `Request failed (HTTP ${res.status})`); return; }
        setProfile(data);
      } catch (err) {
        setError('Could not reach the server. Is the backend running?', err);
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [token]);

  // Fetch game history
  useEffect(() => {
    async function fetchGames() {
      try {
        const res  = await fetch('/api/game-history/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) { setGamesError(data.detail || `Request failed (HTTP ${res.status})`); return; }
        setGames(data.games || []);
      } catch (err) {
        setGamesError('Could not load game history.', err);
      } finally {
        setLoadingGames(false);
      }
    }
    fetchGames();
  }, [token]);

  function handleReviewAgain(game) {
    // Reconstruct the game object expected by ReviewPage
    navigate('/review', {
      state: {
        game: {
          url:            game.game_url,
          pgn:            game.pgn,
          time_control:   game.time_control,
          white_username: game.white_username,
          black_username: game.black_username,
          white_rating:   game.white_rating,
          black_rating:   game.black_rating,
          white_result:   game.white_result,
          black_result:   game.black_result,
          accuracies: {
            white: game.white_accuracy,
            black: game.black_accuracy,
          },
        },
      },
    });
  }

  return (
    <div className="app profile-page">
      <FloatingPieces />

      <header className="app-header">
        <div className="header-top">
          <h1>User Profile</h1>
        </div>
        <p className="header-top">Your account details</p>
      </header>

      {/* Profile card */}
      {loadingProfile && (
        <div className="loading">
          <div className="spinner" />
          <span>Loading profile...</span>
        </div>
      )}

      {error && <div className="error-message api-error">{error}</div>}
      
      {profile && (
        <div className="profile-card">
          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">{profile.email}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label">Password</span>
            <span className="profile-value">{profile.password}</span>
          </div>
        </div>
      )}

      {/* Reviewed games section */}
      <div className="reviewed-games-section">
        <h2 className="reviewed-games-title">Reviewed Games</h2>

        {loadingGames && (
          <div className="loading">
            <div className="spinner" />
            <span>Loading game history...</span>
          </div>
        )}

        {gamesError && <div className="error-message api-error">{gamesError}</div>}

        {!loadingGames && !gamesError && games.length === 0 && (
          <div className="no-games">You haven't reviewed any games yet.</div>
        )}

        {!loadingGames && games.length > 0 && (
          <div className="reviewed-games-table-wrap">
            <table className="reviewed-games-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>White</th>
                  <th>Black</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, idx) => (
                  <tr key={`${game.game_id}-${idx}`}>
                    <td className="reviewed-games-table__num">{idx + 1}</td>
                    <td>
                      <span className="player-name">{game.white_username || '—'}</span>
                      {game.white_rating && (
                        <span className="player-rating">({game.white_rating})</span>
                      )}
                    </td>
                    <td>
                      <span className="player-name">{game.black_username || '—'}</span>
                      {game.black_rating && (
                        <span className="player-rating">({game.black_rating})</span>
                      )}
                    </td>
                    <td><StatusBadge status={game.analysis_status} /></td>
                    <td>
                      <button
                        className="review-again-btn"
                        onClick={() => handleReviewAgain(game)}
                      >
                        Review Again
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}