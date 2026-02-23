import type { Message } from '@chat/shared/schemas/message';

interface MessageSentAckPayload {
  clientMessageId: string;
  messageId: string;
  timestamp: string;
}

function sortByCreatedAt(messages: Message[]): Message[] {
  return messages
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function upsertMessage(messages: Message[], nextMessage: Message): Message[] {
  const next = messages.filter((message) => message.id !== nextMessage.id);
  return sortByCreatedAt([...next, nextMessage]);
}

export function ackOptimistic(messages: Message[], payload: MessageSentAckPayload): Message[] {
  const updated = messages.map((message) =>
    message.clientMessageId === payload.clientMessageId
      ? {
          ...message,
          id: payload.messageId,
          status: 'delivered' as const,
          createdAt: payload.timestamp,
          updatedAt: payload.timestamp,
        }
      : message,
  );

  const deduped = updated.reduce<Message[]>((acc, message) => {
    if (acc.some((existing) => existing.id === message.id)) {
      return acc;
    }
    return [...acc, message];
  }, []);

  return sortByCreatedAt(deduped);
}

export function markMessageError(messages: Message[], clientMessageId: string): Message[] {
  return messages.map((message) =>
    message.clientMessageId === clientMessageId
      ? {
          ...message,
          status: 'error',
        }
      : message,
  );
}
