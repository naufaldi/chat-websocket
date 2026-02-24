import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ConnectionStatus } from '@/components/chat/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { messageKeys, useMessages } from '@/hooks/useMessages';
import { useUserPresence } from '@/hooks/usePresence';
import { conversationsApi } from '@/lib/api';
import { ackOptimistic, markMessageError, upsertMessage } from '@/lib/messages-cache';
import type { CreateConversationInput } from '@chat/shared/schemas/conversation';
import type { Message } from '@chat/shared/schemas/message';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useUsersSearch } from '@/hooks/useUsersSearch';

export function ChatPage() {
  const { user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('chat') || undefined;
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useConversations();
  // Data structure: { conversations: ConversationListItem[], nextCursor, hasMore }
  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const { data: usersSearchData, isLoading: isSearchingUsers } = useUsersSearch(
    showCreateModal ? contactSearchQuery : ''
  );

  const selected = conversations.find((c) => c.id === selectedId);
  const { status: connectionStatus, isConnected } = useSocket();
  const patchMessagesCache = (
    conversationId: string | undefined,
    updater: (messages: Message[]) => Message[],
  ) => {
    if (!conversationId) {
      return;
    }

    queryClient.setQueryData<InfiniteData<{ messages: Message[] }, string | undefined>>(
      messageKeys.list(conversationId),
      (current) => {
        if (!current) {
          return {
            pages: [{ messages: updater([]) }],
            pageParams: [undefined],
          };
        }

        const firstPage = current.pages[0] ?? { messages: [] };
        const nextFirstPage = {
          ...firstPage,
          messages: updater(firstPage.messages),
        };

        return {
          ...current,
          pages: [nextFirstPage, ...current.pages.slice(1)],
        };
      },
    );
  };

  const { typingUserIds, sendMessage, sendTypingStart, sendTypingStop, retryMessage } = useChatSocket({
    conversationId: selectedId,
    currentUserId: user?.id,
    enabled: isConnected,
    onReconnectSync: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onOptimisticMessage: (message) => {
      patchMessagesCache(message.conversationId, (messages) => upsertMessage(messages, message));
    },
    onMessageReceived: (message) => {
      patchMessagesCache(message.conversationId, (messages) => upsertMessage(messages, message));
    },
    onMessageSent: ({ conversationId, clientMessageId, messageId, timestamp }) => {
      patchMessagesCache(conversationId, (messages) =>
        ackOptimistic(messages, { clientMessageId, messageId, timestamp }),
      );
    },
    onMessageError: ({ clientMessageId }) => {
      patchMessagesCache(selectedId, (messages) => markMessageError(messages, clientMessageId));
    },
  });

  const {
    messages: infiniteMessages,
    hasNextPage: hasMessagesNextPage,
    isFetchingNextPage: isFetchingMessagesNextPage,
    fetchNextPage: fetchMessagesNextPage,
  } = useMessages({ conversationId: selectedId });

  const { onInputActivity } = useTypingIndicator({
    conversationId: selectedId,
    onTypingStart: () => sendTypingStart(),
    onTypingStop: () => sendTypingStop(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateConversationInput) => conversationsApi.create(data),
    onSuccess: (result) => {
      setSearchParams({ chat: result.id });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowCreateModal(false);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // If leaving the currently selected conversation, redirect to home
      if (selectedId) {
        setSearchParams({});
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      // If deleting the currently selected conversation, redirect to home
      if (selectedId) {
        setSearchParams({});
      }
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) => 
      conversationsApi.deleteMessage(conversationId, messageId),
    onSuccess: () => {
      if (!selectedId) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: messageKeys.list(selectedId) });
    },
  });

  const handleSelect = (id: string) => {
    setSearchParams({ chat: id });
  };

  const handleCreateConversation = (data: CreateConversationInput) => {
    createMutation.mutate(data);
  };

  const handleLeave = (id: string) => {
    if (confirm('Are you sure you want to leave this group?')) {
      leaveMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?') && selectedId) {
      deleteMessageMutation.mutate({ conversationId: selectedId, messageId });
    }
  };

  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  // Get display name for conversation
  const getDisplayName = (conversation: typeof selected) => {
    if (!conversation) return 'Unknown';
    if (conversation.title) return conversation.title;
    const otherParticipant = conversation.participants.find((p) => p.user.id !== user?.id);
    if (!otherParticipant) {
      const fallback = conversation.participants[0];
      return fallback?.user.displayName || fallback?.user.username || 'Direct Chat';
    }
    return otherParticipant?.user.displayName || otherParticipant?.user.username || 'Direct Chat';
  };

  // Get other participant ID for presence tracking (direct chats only)
  const otherParticipantId = useMemo(() => {
    if (!selected) return null;
    // For group chats, don't track individual presence
    if (selected.title || selected.participants.length > 2) return null;
    const otherParticipant = selected.participants.find((p) => p.user.id !== user?.id);
    return otherParticipant?.user.id ?? null;
  }, [selected, user?.id]);

  // Subscribe to other user's presence
  const { presence: otherUserPresence } = useUserPresence(otherParticipantId);

  const typingNames = selected
    ? selected.participants
        .filter((participant) => typingUserIds.includes(participant.user.id) && participant.user.id !== user?.id)
        .map((participant) => participant.user.displayName || participant.user.username)
    : [];

  return (
    <ChatLayout
      sidebar={
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreateChat={() => setShowCreateModal(true)}
          onLeave={handleLeave}
          onDelete={handleDelete}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onFetchNextPage={() => {
            void fetchNextPage();
          }}
        />
      }
    >
      {selected ? (
        <>
          <ChatHeader
            name={getDisplayName(selected)}
            presence={otherUserPresence}
            participantCount={selected.participants.length}
            connectionStatus={<ConnectionStatus status={connectionStatus} />}
          />
          <MessageList
            messages={infiniteMessages}
            currentUserId={user?.id}
            conversationId={selectedId}
            hasNextPage={hasMessagesNextPage}
            isFetchingNextPage={isFetchingMessagesNextPage}
            fetchNextPage={() => fetchMessagesNextPage()}
            onDeleteMessage={handleDeleteMessage}
            onRetryMessage={retryMessage}
          />
          <TypingIndicator names={typingNames} />
          <MessageInput onSend={handleSendMessage} onTextChange={onInputActivity} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>Select a conversation to start chatting</p>
          </div>
        </div>
      )}

      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateConversation}
        contacts={usersSearchData?.users ?? []}
        isSearching={isSearchingUsers}
        onSearchQueryChange={setContactSearchQuery}
      />
    </ChatLayout>
  );
}
