/**
 * Dashboard — main application page for authenticated users.
 * Displays query form and games table for Chess.com game analysis.
 */

import { useState } from 'react';
import QueryForm from '../components/QueryForm';
import GamesTable from '../components/GamesTable';
import '../App.css';

export default function Dashboard() {
  const [games, setGames] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSubmit({ username, startDate, endDate }) {
    setError('');
    setGames([]);
    setUsername(username);
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        username,
        start_date: startDate,
        end_date: endDate,
      });

      const res = await fetch(`/games?${params}`);
      const data = await res.json();

      if (!res.ok) {
        // Backend returns { detail: "..." } on errors
        setError(data.detail || `Request failed (HTTP ${res.status})`);
        return;
      }

      setGames(data.games || []);
    } catch (err) {
      setError('Could not reach the server. Is the backend running?',err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chess Analyser</h1>
        <p className="subtitle">Look up games from Chess.com by date range</p>
      </header>

      <QueryForm onSubmit={handleSubmit} loading={loading} />

      {/* API / server error */}
      {error && <div className="error-message api-error">{error}</div>}

      {/* Loading spinner */}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Fetching games...</span>
        </div>
      )}

      {/* No games found (after a search that succeeded but returned nothing) */}
      {searched && !loading && !error && games.length === 0 && (
        <div className="no-games">No games found for the given criteria.</div>
      )}

      {/* Results table */}
      <GamesTable games={games} username={username} />
    </div>
  );
}