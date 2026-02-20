/**
 * Authentication context for managing user authentication state.
 * Provides login, logout, register functions and user state throughout the app.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister, getCurrentUser } from '../api/auth.jsx';

const AuthContext = createContext(null);

const TOKEN_KEY = 'chess_analyser_token';

/**
 * AuthProvider component that wraps the app and provides auth state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Load user from token on mount
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const userData = await getCurrentUser(token);
          setUser(userData);
        } catch (error) {
          // Token is invalid, clear it
          console.error('Failed to load user:', error);
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  /**
   * Login with email and password.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<void>}
   */
  const login = useCallback(async (email, password) => {
    const response = await apiLogin(email, password);
    const newToken = response.access_token;

    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);

    // Fetch user data
    const userData = await getCurrentUser(newToken);
    setUser(userData);
  }, []);

  /**
   * Register a new user account.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{message: string}>}
   */
  const register = useCallback(async (email, password) => {
    const response = await apiRegister(email, password);
    return response;
  }, []);

  /**
   * Logout the current user.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Check if user is authenticated.
   */
  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * @returns {{user: object|null, token: string|null, loading: boolean, isAuthenticated: boolean, login: function, logout: function, register: function}}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}