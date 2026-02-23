import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Message, MessageStatus } from '@chat/shared/schemas/message';

// Extended message type with optimistic status
export interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
  error?: string;
}

interface PendingMessage {
  clientMessageId: string;
  content: string;
  createdAt: string;
  status: MessageStatus;
}

// Hook for managing optimistic message updates
export function useOptimisticMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState<Map<string, PendingMessage>>(new Map());

  // Add an optimistic message
  const addOptimisticMessage = useCallback((
    clientMessageId: string,
    content: string,
    senderId: string
  ): OptimisticMessage => {
    const now = new Date().toISOString();
    const optimisticMessage: OptimisticMessage = {
      id: clientMessageId, // Use clientMessageId as temporary ID
      conversationId,
      senderId,
      content,
      contentType: 'text',
      clientMessageId,
      status: 'sending',
      replyToId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isOptimistic: true,
    };

    // Add to pending messages
    setPendingMessages(prev => {
      const next = new Map(prev);
      next.set(clientMessageId, {
        clientMessageId,
        content,
        createdAt: now,
        status: 'sending',
      });
      return next;
    });

    // Update the messages query cache to include this optimistic message
    queryClient.setQueryData(
      ['conversations', conversationId, 'messages'],
      (old: { messages: OptimisticMessage[]; nextCursor?: string } | undefined) => {
        if (!old) {
          return {
            messages: [optimisticMessage],
          };
        }
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      }
    );

    return optimisticMessage;
  }, [conversationId, queryClient]);

  // Mark a message as delivered (confirmed by server)
  const confirmMessage = useCallback((clientMessageId: string, serverMessage: Message) => {
    // Remove from pending
    setPendingMessages(prev => {
      const next = new Map(prev);
      next.delete(clientMessageId);
      return next;
    });

    // Update the cache to replace optimistic message with server message
    queryClient.setQueryData(
      ['conversations', conversationId, 'messages'],
      (old: { messages: OptimisticMessage[]; nextCursor?: string } | undefined) => {
        if (!old) return old;

        return {
          ...old,
          messages: old.messages.map(msg =>
            msg.clientMessageId === clientMessageId
              ? { ...serverMessage, isOptimistic: false }
              : msg
          ),
        };
      }
    );
  }, [conversationId, queryClient]);

  // Mark a message as failed
  const failMessage = useCallback((clientMessageId: string, error: string) => {
    // Update pending status
    setPendingMessages(prev => {
      const next = new Map(prev);
      const pending = next.get(clientMessageId);
      if (pending) {
        next.set(clientMessageId, { ...pending, status: 'error' });
      }
      return next;
    });

    // Update the cache to mark as failed
    queryClient.setQueryData(
      ['conversations', conversationId, 'messages'],
      (old: { messages: OptimisticMessage[]; nextCursor?: string } | undefined) => {
        if (!old) return old;

        return {
          ...old,
          messages: old.messages.map(msg =>
            msg.clientMessageId === clientMessageId
              ? { ...msg, status: 'error' as MessageStatus, error, isOptimistic: false }
              : msg
          ),
        };
      }
    );
  }, [conversationId, queryClient]);

  // Retry a failed message
  const retryMessage = useCallback((clientMessageId: string) => {
    // Update pending status back to sending
    setPendingMessages(prev => {
      const next = new Map(prev);
      const pending = next.get(clientMessageId);
      if (pending) {
        next.set(clientMessageId, { ...pending, status: 'sending' });
      }
      return next;
    });

    // Update the cache to mark as sending again
    queryClient.setQueryData(
      ['conversations', conversationId, 'messages'],
      (old: { messages: OptimisticMessage[]; nextCursor?: string } | undefined) => {
        if (!old) return old;

        return {
          ...old,
          messages: old.messages.map(msg =>
            msg.clientMessageId === clientMessageId
              ? { ...msg, status: 'sending' as MessageStatus, error: undefined }
              : msg
          ),
        };
      }
    );
  }, [conversationId, queryClient]);

  // Get current pending messages count
  const pendingCount = pendingMessages.size;

  // Check if a specific message is pending
  const isPending = useCallback((clientMessageId: string) => {
    return pendingMessages.has(clientMessageId);
  }, [pendingMessages]);

  // Check if a specific message has failed
  const hasFailed = useCallback((clientMessageId: string) => {
    const pending = pendingMessages.get(clientMessageId);
    return pending?.status === 'error';
  }, [pendingMessages]);

  return {
    addOptimisticMessage,
    confirmMessage,
    failMessage,
    retryMessage,
    pendingCount,
    isPending,
    hasFailed,
  };
}
