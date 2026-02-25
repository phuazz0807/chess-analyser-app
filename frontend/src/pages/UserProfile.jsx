/**
 * UserProfile — displays the current user's profile information.
 * Fetches email and masked password from the backend.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../App.css';

export default function UserProfile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || `Request failed (HTTP ${res.status})`);
          return;
        }

        setProfile(data);
      } catch (err) {
        setError('Could not reach the server. Is the backend running?',err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [token]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>User Profile</h1>
        </div>
        <p className="header-top">Your account details</p>
      </header>

      {loading && (
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
    </div>
  );
}