import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from '@chat/shared/schemas/message';
import { chatSocketService, type ChatSocketService } from '@/lib/socket';
import { conversationsApi } from '@/lib/api';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

function buildClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`.padEnd(36, '0').slice(0, 36);
}

interface UseChatSocketOptions {
  conversationId?: string;
  currentUserId?: string;
  enabled?: boolean;
  service?: ChatSocketService;
  onReconnectSync?: (payload: { conversationId: string; disconnectedAt: string }) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const {
    conversationId,
    currentUserId,
    enabled = true,
    service = chatSocketService,
    onReconnectSync,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const disconnectedAtRef = useRef<string | null>(null);

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

      setMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    const offMessageSent = service.on('message:sent', ({ clientMessageId, messageId, timestamp }) => {
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

    const offMessageError = service.on('message:error', ({ clientMessageId }) => {
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
  }, [conversationId, service]);

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
    [conversationId, currentUserId, enabled, service]
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

  return useMemo(
    () => ({
      messages,
      typingUserIds,
      sendMessage,
      sendTypingStart,
      sendTypingStop,
    }),
    [messages, sendMessage, sendTypingStart, sendTypingStop, typingUserIds]
  );
}
