import { useInfiniteQuery } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api';
import type { Message } from '@chat/shared/schemas/message';

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (conversationId: string) => [...messageKeys.lists(), conversationId] as const,
};

interface UseMessagesOptions {
  conversationId?: string;
}

export function useMessages({ conversationId }: UseMessagesOptions = {}) {
  const query = useInfiniteQuery({
    queryKey: messageKeys.list(conversationId ?? ''),
    queryFn: ({ pageParam }) => {
      if (!conversationId) return Promise.resolve({ messages: [] });
      return conversationsApi.listMessages(conversationId, pageParam);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.messages.length === 0) return undefined;
      const oldestMessage = lastPage.messages[0];
      return oldestMessage.id;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });

  const messages: Message[] = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return {
    messages,
    ...query,
  };
}
