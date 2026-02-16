import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api';
import type { ConversationDetail } from '@/types/conversation';

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

export function useConversations(limit = 50) {
  return useInfiniteQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async ({ pageParam }: { pageParam?: string }) => conversationsApi.list(pageParam, limit),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useConversation(id: string) {
  return useQuery<ConversationDetail>({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationsApi.get(id),
    enabled: !!id,
  });
}
