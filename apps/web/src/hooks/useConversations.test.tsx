import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useConversations } from './useConversations';
import { conversationsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  conversationsApi: {
    list: vi.fn(),
  },
}));

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches initial page and next page using cursor pagination', async () => {
    vi.mocked(conversationsApi.list)
      .mockResolvedValueOnce({
        conversations: [
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            type: 'direct',
            title: null,
            avatarUrl: null,
            createdBy: '11111111-1111-1111-1111-111111111111',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            participants: [],
            lastMessage: null,
            unreadCount: 0,
          },
        ],
        nextCursor: 'cursor-1',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        conversations: [
          {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            type: 'direct',
            title: null,
            avatarUrl: null,
            createdBy: '11111111-1111-1111-1111-111111111111',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            participants: [],
            lastMessage: null,
            unreadCount: 0,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(conversationsApi.list).toHaveBeenCalledWith(undefined, 50);

    await result.current.fetchNextPage();
    await waitFor(() => {
      expect(conversationsApi.list).toHaveBeenCalledWith('cursor-1', 50);
    });
  });
});
