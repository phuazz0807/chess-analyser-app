/**
 * RegisterPage — user registration form with email, password, and confirm password.
 * Includes client-side password validation with live feedback.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validatePassword } from '../api/auth.jsx';
import './AuthPages.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [touched, setTouched] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Validate password in real-time
  useEffect(() => {
    if (password && touched) {
      const { errors } = validatePassword(password);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password, touched]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password) {
      setError('Please enter a password');
      return;
    }

    // Password validation
    const { isValid, errors } = validatePassword(password);
    if (!isValid) {
      setError(errors.join('. '));
      return;
    }

    // Confirm password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(email.trim(), password);
      // Redirect to login with success message
      navigate('/login', {
        state: { message: 'Registration successful! Please log in.' },
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Register</h1>
        <p className="auth-subtitle">Create your Chess Analyser account</p>

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={loading}
              autoComplete="new-password"
            />
            {/* Live password validation feedback */}
            {touched && password && (
              <div className="password-requirements">
                <PasswordRequirement
                  met={password.length >= 8}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  met={/[A-Z]/.test(password)}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={/\d/.test(password)}
                  text="One digit"
                />
                <PasswordRequirement
                  met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)}
                  text="One special character"
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <span className="field-error">Passwords do not match</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Password requirement indicator component.
 */
function PasswordRequirement({ met, text }) {
  return (
    <div className={`requirement ${met ? 'met' : 'unmet'}`}>
      <span className="indicator">{met ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  );
}
