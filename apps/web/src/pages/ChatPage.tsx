import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { conversationsApi } from '@/lib/api';
import type { CreateConversationInput } from '@chat/shared/schemas/conversation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('chat') || undefined;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useConversations();
  // Data structure: { conversations: ConversationListItem[], nextCursor, hasMore }
  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  const [showCreateModal, setShowCreateModal] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId);

  const createMutation = useMutation({
    mutationFn: (data: CreateConversationInput) => conversationsApi.create(data),
    onSuccess: (result) => {
      setSearchParams({ chat: result.id });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowCreateModal(false);
    },
  });

  const handleSelect = (id: string) => {
    setSearchParams({ chat: id });
  };

  const handleCreateConversation = (data: CreateConversationInput) => {
    createMutation.mutate(data);
  };

  const handleSendMessage = (content: string) => {
    // TODO: Integrate with WebSocket or API
    console.log('Send message:', content);
  };

  // Get display name for conversation
  const getDisplayName = (conversation: typeof selected) => {
    if (!conversation) return 'Unknown';
    if (conversation.title) return conversation.title;
    const otherParticipant = conversation.participants.find((p) => p.role !== 'owner');
    return otherParticipant?.user.displayName || otherParticipant?.user.username || 'Direct Chat';
  };

  return (
    <ChatLayout
      sidebar={
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreateChat={() => setShowCreateModal(true)}
        />
      }
    >
      {selected ? (
        <>
          <ChatHeader name={getDisplayName(selected)} status="online" />
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {/* TODO: Replace with actual messages from API */}
            <MessageBubble content="Hey! How are you?" timestamp={new Date().toISOString()} isSent={false} />
            <MessageBubble
              content="I'm doing great, thanks!"
              timestamp={new Date().toISOString()}
              isSent={true}
              isRead={true}
            />
          </div>
          <MessageInput onSend={handleSendMessage} />
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
      />
    </ChatLayout>
  );
}
