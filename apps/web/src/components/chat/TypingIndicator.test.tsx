import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('renders nothing when no users are typing', () => {
    const { container } = render(<TypingIndicator names={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders typing copy for one user', () => {
    render(<TypingIndicator names={['Alice']} />);
    expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
  });
});
