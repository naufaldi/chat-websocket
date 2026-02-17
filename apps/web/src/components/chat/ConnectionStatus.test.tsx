import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('renders connected state label', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders reconnecting state label', () => {
    render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});
