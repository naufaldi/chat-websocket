import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReadReceipt, ReadReceiptCount, ReadReceiptDetails } from './ReadReceipt';

describe('ReadReceipt', () => {
  it('renders single gray check for sending', () => {
    const { container } = render(<ReadReceipt status="sending" />);
    const receipt = screen.getByLabelText('Message sent');

    expect(receipt).toBeInTheDocument();
    expect(receipt).toHaveClass('text-gray-400');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(1);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(0);
  });

  it('renders single gray check for error', () => {
    const { container } = render(<ReadReceipt status="error" />);
    const receipt = screen.getByLabelText('Message sent');

    expect(receipt).toBeInTheDocument();
    expect(receipt).toHaveClass('text-gray-400');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(1);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(0);
  });

  it('renders gray double check for delivered', () => {
    const { container } = render(<ReadReceipt status="delivered" />);
    const receipt = screen.getByLabelText('Message delivered');

    expect(receipt).toBeInTheDocument();
    expect(receipt).toHaveClass('text-gray-400');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(0);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(1);
  });

  it('renders blue double check for read', () => {
    const { container } = render(<ReadReceipt status="read" />);
    const receipt = screen.getByLabelText('Message read');

    expect(receipt).toBeInTheDocument();
    expect(receipt).toHaveClass('text-[#3390EC]');
    expect(container.querySelectorAll('svg.lucide-check')).toHaveLength(0);
    expect(container.querySelectorAll('svg.lucide-check-check')).toHaveLength(1);
  });
});

describe('ReadReceiptDetails', () => {
  it('component is exported correctly', () => {
    expect(ReadReceiptDetails).toBeDefined();
    expect(typeof ReadReceiptDetails).toBe('function');
  });
});

describe('ReadReceiptCount', () => {
  it('component is exported correctly', () => {
    expect(ReadReceiptCount).toBeDefined();
    expect(typeof ReadReceiptCount).toBe('function');
  });
});
