/**
 * ProtectedRoute component that redirects to login if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wrapper component for protected routes.
 * Redirects to /login if user is not authenticated.
 * Shows loading state while auth status is being determined.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}