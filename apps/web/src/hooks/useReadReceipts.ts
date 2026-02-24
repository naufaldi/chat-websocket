import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ReadReceiptsListResponse,
  ReceiptUpdatedEvent,
  ReceiptCountEvent,
} from '@chat/shared/schemas/read-receipt';
import { chatSocketService } from '@/lib/socket';
import { readReceiptsApi } from '@/lib/api';

// Query keys for read receipts
export const readReceiptKeys = {
  all: ['readReceipts'] as const,
  message: (messageId: string) => ['readReceipts', 'message', messageId] as const,
  conversation: (conversationId: string) => ['readReceipts', 'conversation', conversationId] as const,
};

// Hook for fetching read receipts for a message
export function useReadReceipts(messageId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: readReceiptKeys.message(messageId || ''),
    queryFn: async (): Promise<ReadReceiptsListResponse | null> => {
      if (!messageId) return null;
      // Fetch read receipts from REST API
      return readReceiptsApi.getForMessage(messageId);
    },
    enabled: !!messageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Subscribe to read receipt updates via WebSocket
  useEffect(() => {
    if (!messageId) return;

    const handleReceiptUpdated = (event: ReceiptUpdatedEvent) => {
      if (event.messageId === messageId) {
        queryClient.setQueryData(
          readReceiptKeys.message(messageId),
          (old: ReadReceiptsListResponse | null) => {
            if (!old) {
              return {
                receipts: [{
                  messageId,
                  userId: event.userId,
                  readAt: event.readAt,
                  user: event.user!,
                }],
                totalCount: 1,
                readCount: 1,
              };
            }

            // Check if this user already has a receipt
            const existingIndex = old.receipts.findIndex(r => r.userId === event.userId);
            const newReceipt = {
              messageId,
              userId: event.userId,
              readAt: event.readAt,
              user: event.user!,
            };

            if (existingIndex >= 0) {
              // Update existing receipt
              const updatedReceipts = [...old.receipts];
              updatedReceipts[existingIndex] = newReceipt;
              return {
                ...old,
                receipts: updatedReceipts,
                readCount: updatedReceipts.length,
              };
            } else {
              // Add new receipt
              return {
                ...old,
                receipts: [...old.receipts, newReceipt],
                readCount: old.receipts.length + 1,
              };
            }
          }
        );
      }
    };

    const handleReceiptCount = (event: ReceiptCountEvent) => {
      if (event.messageId === messageId) {
        queryClient.setQueryData(
          readReceiptKeys.message(messageId),
          (old: ReadReceiptsListResponse | null) => {
            if (!old) {
              return {
                receipts: event.readBy?.map(rb => ({
                  messageId,
                  userId: rb.userId,
                  readAt: new Date().toISOString(),
                  user: {
                    id: rb.userId,
                    username: '',
                    displayName: rb.displayName,
                    avatarUrl: null,
                    lastSeenAt: null,
                  },
                })) || [],
                totalCount: event.totalParticipants || 0,
                readCount: event.readCount,
              };
            }
            return {
              ...old,
              readCount: event.readCount,
              totalCount: event.totalParticipants || old.totalCount,
            };
          }
        );
      }
    };

    const unsubscribeUpdated = chatSocketService.on('receipt:updated', handleReceiptUpdated);
    const unsubscribeCount = chatSocketService.on('receipt:count', handleReceiptCount);

    return () => {
      unsubscribeUpdated();
      unsubscribeCount();
    };
  }, [messageId, queryClient]);

  return {
    receipts: query.data?.receipts || [],
    readCount: query.data?.readCount || 0,
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

// Hook for marking messages as read
export function useMarkAsRead() {
  return {
    markAsRead: (conversationId: string, messageId: string) => {
      // Send via WebSocket using the proper socket service method
      if (chatSocketService.isConnected()) {
        chatSocketService.markAsRead({ conversationId, messageId });
      }
    },
  };
}
