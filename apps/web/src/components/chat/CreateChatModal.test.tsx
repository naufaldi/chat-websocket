import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateChatModal } from './CreateChatModal';

describe('CreateChatModal', () => {
  it('updates search query and submits selected contacts', () => {
    const onClose = vi.fn();
    const onCreate = vi.fn();
    const onSearchQueryChange = vi.fn();

    render(
      <CreateChatModal
        isOpen={true}
        onClose={onClose}
        onCreate={onCreate}
        onSearchQueryChange={onSearchQueryChange}
        contacts={[
          {
            id: '22222222-2222-2222-2222-222222222222',
            displayName: 'Alice',
            username: 'alice',
            avatarUrl: null,
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search contacts...'), {
      target: { value: 'ali' },
    });
    expect(onSearchQueryChange).toHaveBeenCalledWith('ali');

    fireEvent.click(screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Chat' }));

    expect(onCreate).toHaveBeenCalledWith({
      type: 'direct',
      title: undefined,
      participantIds: ['22222222-2222-2222-2222-222222222222'],
    });
    expect(onClose).toHaveBeenCalled();
  });
});
