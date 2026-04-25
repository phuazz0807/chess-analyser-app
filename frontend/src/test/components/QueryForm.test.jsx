/**
 * Tests for components/QueryForm.jsx
 * Covers: rendering, validation branches, successful submit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueryForm from '../../components/QueryForm';

// Mock helpers module
vi.mock('../../helpers', () => ({
  todayString: () => '2025-01-01',
}));

const mockSubmit = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function renderForm(loading = false) {
  return render(<QueryForm onSubmit={mockSubmit} loading={loading} />);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('QueryForm rendering', () => {
  it('renders username, start date, end date fields and submit button', () => {
    renderForm();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch games/i })).toBeInTheDocument();
  });

  it('shows Loading... and disables button when loading', () => {
    renderForm(true);
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
describe('QueryForm validation', () => {
  it('shows error when username is empty', async () => {
    renderForm();
    fireEvent.submit(screen.getByRole('button', { name: /fetch games/i }).closest('form'));
    expect(await screen.findByText(/please enter a chess\.com username/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error when username is only whitespace', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/username/i), '   ');
    fireEvent.submit(screen.getByRole('button', { name: /fetch games/i }).closest('form'));
    expect(await screen.findByText(/please enter a chess\.com username/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error when start date is after end date', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/username/i), 'hikaru');
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2025-06-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-01' } });
    fireEvent.submit(screen.getByRole('button', { name: /fetch games/i }).closest('form'));
    expect(await screen.findByText(/start date cannot be after end date/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Successful submit
// ---------------------------------------------------------------------------
describe('QueryForm successful submit', () => {
  it('calls onSubmit with trimmed username and dates', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/username/i), '  hikaru  ');
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-01-31' } });
    fireEvent.submit(screen.getByRole('button', { name: /fetch games/i }).closest('form'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        username: 'hikaru',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
    });
  });

  it('clears validation error on new submit attempt', async () => {
    renderForm();
    // First trigger an error
    fireEvent.submit(screen.getByRole('button', { name: /fetch games/i }).closest('form'));
    expect(await screen.findByText(/please enter a chess\.com username/i)).toBeInTheDocument();

    // Then fill in and resubmit
    await userEvent.type(screen.getByLabelText(/username/i), 'magnus');
    fireEvent.submit(screen.getByRole('button', { name: /fetch games/i }).closest('form'));
    await waitFor(() => {
      expect(screen.queryByText(/please enter a chess\.com username/i)).not.toBeInTheDocument();
    });
  });
});