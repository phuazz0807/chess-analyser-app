import { useState } from 'react';
import { todayString } from '../helpers';

/**
 * QueryForm — input form for username and date range.
 * Performs client-side validation before calling onSubmit.
 */
export default function QueryForm({ onSubmit, loading }) {
  const today = todayString();
  const [username, setUsername] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [validationError, setValidationError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError('');

    // Client-side validation
    const trimmed = username.trim();
    if (!trimmed) {
      setValidationError('Please enter a Chess.com username.');
      return;
    }
    if (!startDate || !endDate) {
      setValidationError('Please select both a start date and an end date.');
      return;
    }
    if (startDate > endDate) {
      setValidationError('Start date cannot be after end date.');
      return;
    }

    onSubmit({ username: trimmed, startDate, endDate });
  }

  return (
    <form className="query-form" onSubmit={handleSubmit}>
      {validationError && (
        <div className="error-message validation-error">{validationError}</div>
      )}

      <div className="form-row">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="e.g. hikaru"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="start-date">Start Date</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="end-date">End Date</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Games'}
      </button>
    </form>
  );
}
