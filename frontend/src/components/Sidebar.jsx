/**
 * Sidebar — persistent navigation sidebar for authenticated pages.
 * Contains links to Dashboard and User Profile, plus the logout button.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">♟</span>
        <span className="sidebar-logo-text">Chess Analyser</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            'sidebar-link' + (isActive ? ' sidebar-link--active' : '')
          }
        >
          <span className="sidebar-link-icon">⊞</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            'sidebar-link' + (isActive ? ' sidebar-link--active' : '')
          }
        >
          <span className="sidebar-link-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            </span>
          Profile
        </NavLink>
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}