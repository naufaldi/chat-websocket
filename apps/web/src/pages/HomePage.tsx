import { useAuthContext } from '@/contexts/AuthContext';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { Sidebar } from '@/components/chat/Sidebar';
import { useConversations } from '@/hooks/useConversations';
import { useSocket } from '@/hooks/useSocket';
import { usePresence } from '@/hooks/usePresence';
import { PresenceIndicator } from '@/components/ui/PresenceIndicator';
import { PresenceText } from '@/components/ui/PresenceIndicator';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Users, Clock, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from '@/hooks/useChatSocket';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { useUsersSearch } from '@/hooks/useUsersSearch';
import { useState } from 'react';
import { conversationsApi } from '@/lib/api';
import type { CreateConversationInput } from '@chat/shared/schemas/conversation';
import { useMutation } from '@tanstack/react-query';

// Mock online contacts for the sidebar
// In production, this would come from the presence API
const mockOnlineContacts = [
  { id: '1', displayName: 'Alice Johnson', username: 'alice', status: 'online' as const },
  { id: '2', displayName: 'Bob Smith', username: 'bob', status: 'away' as const },
  { id: '3', displayName: 'Carol White', username: 'carol', status: 'online' as const },
];

function OnlineContactsSidebar() {
  const { status } = usePresence();

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-64">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Online Contacts</h2>
        <p className="text-sm text-gray-500 mt-1">{mockOnlineContacts.length} contacts online</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Current user presence */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Your Status</p>
          <div className="flex items-center gap-2">
            <PresenceIndicator status={status} size="sm" />
            <PresenceText status={status} />
          </div>
        </div>

        {/* Online contacts list */}
        <div className="p-2">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2 px-2">Contacts</p>
          {mockOnlineContacts.map(contact => (
            <Link
              key={contact.id}
              to={`/?chat=${contact.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white font-medium">
                  {contact.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <PresenceIndicator status={contact.status} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{contact.displayName}</p>
                <PresenceText status={contact.status} className="text-xs" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-2 bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Go to Chat</span>
        </Link>
      </div>
    </div>
  );
}

function DashboardStats() {
  const { data } = useConversations();
  const conversations = data?.pages.flatMap(page => page.conversations) || [];

  const stats = [
    {
      label: 'Conversations',
      value: conversations.length,
      icon: MessageSquare,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Contacts Online',
      value: mockOnlineContacts.length,
      icon: Users,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Last Activity',
      value: 'Just now',
      icon: Clock,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentConversations() {
  const { data, isLoading } = useConversations();
  const conversations = data?.pages.flatMap(page => page.conversations).slice(0, 5) || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Recent Conversations</h3>
      </div>
      {isLoading ? (
        <div className="p-4 text-center text-gray-500">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No conversations yet</p>
          <p className="text-sm mt-1">Start chatting to see your conversations here</p>
        </div>
      ) : (
        <ul className="divide-y">
          {conversations.map(conv => (
            <li key={conv.id}>
              <Link
                to={`/?chat=${conv.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white font-medium">
                  {(conv.title || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{conv.title || 'Direct Chat'}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.participants.length} participants
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="p-4 border-t border-gray-100">
        <Link
          to="/"
          className="text-[#3390EC] hover:underline text-sm font-medium"
        >
          View all conversations →
        </Link>
      </div>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('chat') || undefined;
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useConversations();
  const conversations = data?.pages.flatMap(page => page.conversations) || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const { data: usersSearchData, isLoading: isSearchingUsers } = useUsersSearch(
    showCreateModal ? contactSearchQuery : ''
  );

  const { status: connectionStatus, isConnected } = useSocket();
  const { messages, typingUserIds, sendMessage } = useChatSocket({
    conversationId: selectedId,
    currentUserId: user?.id,
    enabled: isConnected,
    onReconnectSync: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateConversationInput) => conversationsApi.create(data),
    onSuccess: result => {
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

  return (
    <ChatLayout
      sidebar={
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreateChat={() => setShowCreateModal(true)}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onFetchNextPage={() => void fetchNextPage()}
        />
      }
      rightSidebar={<OnlineContactsSidebar />}
    >
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.displayName || 'User'}!
            </h1>
            <p className="text-gray-500 mt-1">
              Here's what's happening with your conversations
            </p>
          </div>

          <DashboardStats />
          <RecentConversations />
        </div>
      </div>

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
