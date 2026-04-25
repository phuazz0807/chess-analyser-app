/**
 * Tests for components/Sidebar.jsx
 * Covers: rendering, nav links, logout behaviour
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderSidebar(currentPath = '/dashboard') {
  useAuth.mockReturnValue({ logout: mockLogout });
  return render(
    <MemoryRouter initialEntries={[currentPath]}>
      <Sidebar />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('Sidebar rendering', () => {
  it('renders the logo text', () => {
    renderSidebar();
    expect(screen.getByText(/chess analyser/i)).toBeInTheDocument();
  });

  it('renders dashboard and profile nav links', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('applies active class to dashboard link when on /dashboard', () => {
    renderSidebar('/dashboard');
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('sidebar-link--active');
  });

  it('applies active class to profile link when on /profile', () => {
    renderSidebar('/profile');
    const profileLink = screen.getByRole('link', { name: /profile/i });
    expect(profileLink).toHaveClass('sidebar-link--active');
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
describe('Sidebar logout', () => {
  it('calls logout and navigates to /login when logout button is clicked', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});