import { render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { MessageStatus } from '@chat/shared/schemas/message';
import { MessageBubble } from './MessageBubble';

const TIMESTAMP = '2026-01-05T13:52:00.000Z';

function renderSentBubble(status: MessageStatus) {
  return render(
    <MessageBubble
      content="dawd"
      timestamp={TIMESTAMP}
      isSent={true}
      status={status}
    />
  );
}

describe('MessageBubble', () => {
  it('renders one gray check for sending on sent messages', () => {
    const { container } = renderSentBubble('sending');

    expect(screen.getByLabelText('Message sent')).toHaveClass('text-gray-400');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(1);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(0);
  });

  it('renders gray double check for delivered on sent messages', () => {
    const { container } = renderSentBubble('delivered');

    expect(screen.getByLabelText('Message delivered')).toHaveClass('text-gray-400');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(0);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(1);
  });

  it('renders blue double check for read on sent messages', () => {
    const { container } = renderSentBubble('read');

    expect(screen.getByLabelText('Message read')).toHaveClass('text-[#3390EC]');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(0);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(1);
  });

  it('does not render read receipt for incoming messages', () => {
    const { container } = render(
      <MessageBubble
        content="hello"
        timestamp={TIMESTAMP}
        isSent={false}
        status="read"
      />
    );

    expect(screen.queryByLabelText('Message sent')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Message delivered')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Message read')).not.toBeInTheDocument();
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(0);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(0);
  });

  it('renders formatted timestamp', () => {
    renderSentBubble('sending');
    expect(screen.getByText(format(new Date(TIMESTAMP), 'HH:mm'))).toBeInTheDocument();
  });
});
