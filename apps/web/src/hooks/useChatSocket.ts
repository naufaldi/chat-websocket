import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from '@chat/shared/schemas/message';
import { chatSocketService, type ChatSocketService } from '@/lib/socket';
import { conversationsApi } from '@/lib/api';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

function buildClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`.padEnd(36, '0').slice(0, 36);
}

interface PendingMessage {
  content: string;
  conversationId: string;
  attempts: number;
}

interface UseChatSocketOptions {
  conversationId?: string;
  currentUserId?: string;
  enabled?: boolean;
  service?: ChatSocketService;
  onReconnectSync?: (payload: { conversationId: string; disconnectedAt: string }) => void;
  onOptimisticMessage?: (message: Message) => void;
  onMessageReceived?: (message: Message) => void;
  onMessageSent?: (payload: {
    clientMessageId: string;
    messageId: string;
    timestamp: string;
    conversationId: string;
  }) => void;
  onMessageError?: (payload: { clientMessageId: string }) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const {
    conversationId,
    currentUserId,
    enabled = true,
    service = chatSocketService,
    onReconnectSync,
    onOptimisticMessage,
    onMessageReceived,
    onMessageSent,
    onMessageError,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const disconnectedAtRef = useRef<string | null>(null);
  const pendingMessagesRef = useRef<Map<string, PendingMessage>>(new Map());

  useEffect(() => {
    setMessages([]);
    setTypingUserIds([]);
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !conversationId) {
      return () => {
        cancelled = true;
      };
    }

    const loadMessages = async () => {
      try {
        const result = await conversationsApi.listMessages(conversationId);
        if (cancelled) {
          return;
        }

        setMessages((prev) => {
          if (prev.length === 0) {
            return result.messages;
          }

          const messageMap = new Map<string, Message>();
          result.messages.forEach((message) => {
            messageMap.set(message.id, message);
          });
          prev.forEach((message) => {
            messageMap.set(message.id, message);
          });

          return Array.from(messageMap.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      } catch {}
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId, enabled]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    service.subscribe(conversationId);

    return () => {
      service.unsubscribe(conversationId);
    };
  }, [conversationId, enabled, service]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    return service.onConnectionStatusChange((status) => {
      if (status === 'disconnected' || status === 'reconnecting') {
        if (!disconnectedAtRef.current) {
          disconnectedAtRef.current = new Date().toISOString();
        }
        return;
      }

      if (status === 'connected' && disconnectedAtRef.current) {
        service.subscribe(conversationId);
        onReconnectSync?.({
          conversationId,
          disconnectedAt: disconnectedAtRef.current,
        });
        disconnectedAtRef.current = null;
      }
    });
  }, [conversationId, enabled, onReconnectSync, service]);

  useEffect(() => {
    const offMessageReceived = service.on('message:received', ({ message }) => {
      if (message.conversationId !== conversationId) {
        return;
      }

      onMessageReceived?.(message);
      setMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    const offMessageSent = service.on('message:sent', ({ clientMessageId, messageId, timestamp, conversationId: eventConversationId }) => {
      // Clean up pending message on successful send
      pendingMessagesRef.current.delete(clientMessageId);

      onMessageSent?.({
        clientMessageId,
        messageId,
        timestamp,
        conversationId: eventConversationId,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.clientMessageId === clientMessageId
            ? {
                ...message,
                id: messageId,
                status: 'delivered',
                createdAt: timestamp,
                updatedAt: timestamp,
              }
            : message
        )
      );
    });

    const offMessageError = service.on('message:error', ({ clientMessageId, retryable, retryAfter }) => {
      const pending = pendingMessagesRef.current.get(clientMessageId);

      // Attempt automatic retry if retryable and under max retries
      if (retryable && pending && pending.attempts < MAX_RETRIES) {
        pending.attempts += 1;
        const delay = retryAfter ?? BASE_RETRY_DELAY * Math.pow(2, pending.attempts - 1);

        setTimeout(() => {
          if (service.getStatus() === 'connected') {
            try {
              service.sendMessage({
                conversationId: pending.conversationId,
                content: pending.content,
                clientMessageId,
              });
            } catch {
              // Retry failed, mark as error
              pendingMessagesRef.current.delete(clientMessageId);
              onMessageError?.({ clientMessageId });
              setMessages((prev) =>
                prev.map((message) =>
                  message.clientMessageId === clientMessageId ? { ...message, status: 'error' } : message
                )
              );
            }
          } else {
            // Socket not connected, retry failed
            pendingMessagesRef.current.delete(clientMessageId);
            onMessageError?.({ clientMessageId });
            setMessages((prev) =>
              prev.map((message) =>
                message.clientMessageId === clientMessageId ? { ...message, status: 'error' } : message
              )
            );
          }
        }, delay);

        return;
      }

      // Max retries reached or not retryable, clean up and mark as error
      pendingMessagesRef.current.delete(clientMessageId);
      onMessageError?.({ clientMessageId });
      setMessages((prev) =>
        prev.map((message) =>
          message.clientMessageId === clientMessageId ? { ...message, status: 'error' } : message
        )
      );
    });

    const offTypingStarted = service.on('typing:started', ({ conversationId: eventConversationId, userId }) => {
      if (eventConversationId !== conversationId) {
        return;
      }

      setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    const offTypingStopped = service.on('typing:stopped', ({ conversationId: eventConversationId, userId }) => {
      if (eventConversationId !== conversationId) {
        return;
      }

      setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      offMessageReceived();
      offMessageSent();
      offMessageError();
      offTypingStarted();
      offTypingStopped();
    };
  }, [conversationId, onMessageError, onMessageReceived, onMessageSent, service]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!conversationId) {
        console.error('[useChatSocket] Cannot send message: no conversation selected');
        return;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      const now = new Date().toISOString();
      const clientMessageId = buildClientMessageId();

      // Store pending message for potential retry
      pendingMessagesRef.current.set(clientMessageId, {
        content: trimmed,
        conversationId,
        attempts: 0,
      });

      // If socket is not connected, create message with error status so user sees feedback
      const isConnected = enabled && service.getStatus() === 'connected';
      const optimisticMessage: Message = {
        id: clientMessageId,
        conversationId,
        senderId: currentUserId ?? NIL_UUID,
        content: trimmed,
        contentType: 'text',
        clientMessageId,
        status: isConnected ? 'sending' : 'error',
        replyToId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      onOptimisticMessage?.(optimisticMessage);
      setMessages((prev) => [...prev, optimisticMessage]);

      if (!isConnected) {
        console.error('[useChatSocket] Cannot send message: socket not connected');
        return;
      }

      try {
        service.sendMessage({
          conversationId,
          content: trimmed,
          clientMessageId,
        });
      } catch (error) {
        console.error('[useChatSocket] Failed to send message:', error);
        setMessages((prev) =>
          prev.map((message) =>
            message.clientMessageId === clientMessageId ? { ...message, status: 'error' } : message
          )
        );
      }
    },
    [conversationId, currentUserId, enabled, onOptimisticMessage, service]
  );

  const sendTypingStart = useCallback(() => {
    if (!conversationId || !enabled) {
      return;
    }
    service.typingStart(conversationId);
  }, [conversationId, enabled, service]);

  const sendTypingStop = useCallback(() => {
    if (!conversationId || !enabled) {
      return;
    }
    service.typingStop(conversationId);
  }, [conversationId, enabled, service]);

  /**
   * Retry sending a failed message.
   * Uses exponential backoff for retry attempts.
   */
  const retryMessage = useCallback(
    (clientMessageId: string) => {
      const pending = pendingMessagesRef.current.get(clientMessageId);
      if (!pending || pending.attempts >= MAX_RETRIES) {
        console.error('[useChatSocket] Max retries reached or message not found:', clientMessageId);
        return false;
      }

      if (service.getStatus() !== 'connected') {
        console.error('[useChatSocket] Cannot retry: socket not connected');
        return false;
      }

      pending.attempts += 1;

      // Update message status to sending
      setMessages((prev) =>
        prev.map((message) =>
          message.clientMessageId === clientMessageId ? { ...message, status: 'sending' } : message
        )
      );

      try {
        service.sendMessage({
          conversationId: pending.conversationId,
          content: pending.content,
          clientMessageId,
        });
        return true;
      } catch (error) {
        console.error('[useChatSocket] Retry failed:', error);
        // Revert to error status
        setMessages((prev) =>
          prev.map((message) =>
            message.clientMessageId === clientMessageId ? { ...message, status: 'error' } : message
          )
        );
        return false;
      }
    },
    [service]
  );

  return useMemo(
    () => ({
      messages,
      typingUserIds,
      sendMessage,
      sendTypingStart,
      sendTypingStop,
      retryMessage,
    }),
    [messages, sendMessage, sendTypingStart, sendTypingStop, retryMessage, typingUserIds]
  );
}
