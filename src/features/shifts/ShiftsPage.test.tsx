import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceProvider } from '../../hooks/useWorkspace';
import { ShiftsPage } from './ShiftsPage';

describe('worker attendance workflow', () => {
  it('records check-in and exposes the check-out action', async () => {
    render(<WorkspaceProvider><ShiftsPage /></WorkspaceProvider>);
    const [checkIn] = screen.getAllByRole('button', { name: 'Check in' });
    if (!checkIn) throw new Error('No check-in action is available for this worker.');
    expect(checkIn).toBeEnabled();
    fireEvent.click(checkIn);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Check out' })[0]).toBeEnabled());
    expect(screen.getByText('Check-in recorded. Have a safe shift.')).toBeInTheDocument();
  });

  it('keeps attendance actions available as a typed workflow', () => {
    render(<WorkspaceProvider><ShiftsPage /></WorkspaceProvider>);
    expect(screen.getByRole('heading', { name: 'Shifts & attendance' })).toBeInTheDocument();
    expect(screen.getByText(/Location verification is not enabled/)).toBeInTheDocument();
  });
});
