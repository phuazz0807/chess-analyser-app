/**
 * Tests for components/Layout.jsx
 * Covers: renders sidebar and outlet content
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout';

// Mock Sidebar to isolate Layout logic
vi.mock('../../components/Sidebar', () => ({
  default: () => <div>Mocked Sidebar</div>,
}));

// Mock AuthContext (needed by Sidebar even when mocked, just in case)
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ logout: vi.fn() })),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  it('renders the sidebar', () => {
    renderLayout();
    expect(screen.getByText('Mocked Sidebar')).toBeInTheDocument();
  });

  it('renders the child route content via Outlet', () => {
    renderLayout();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});