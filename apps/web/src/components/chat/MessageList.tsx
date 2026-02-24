import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import type { Message } from '@chat/shared/schemas/message';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  conversationId?: string;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onDeleteMessage?: (messageId: string) => void;  // eslint-disable-line no-unused-vars
  onRetryMessage?: (clientMessageId: string) => boolean;  // eslint-disable-line no-unused-vars
}

export function MessageList({
  messages,
  currentUserId,
  conversationId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onDeleteMessage,
  onRetryMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(atBottom);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, shouldAutoScroll]);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No messages yet. Start the conversation.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 bg-white"
    >
      <div ref={loadMoreRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="text-center py-2 text-gray-400 text-sm">
          Loading older messages...
        </div>
      )}

      {!hasNextPage && messages.length > 0 && (
        <div className="text-center py-2 text-gray-400 text-sm">
          No more messages
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          messageId={message.id}
          clientMessageId={message.clientMessageId ?? undefined}
          conversationId={conversationId}
          content={message.content}
          timestamp={message.createdAt}
          isSent={message.senderId === currentUserId}
          status={message.status}
          onDelete={onDeleteMessage}
          onRetry={onRetryMessage}
        />
      ))}
    </div>
  );
}
