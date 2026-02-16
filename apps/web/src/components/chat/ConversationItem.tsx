import { format } from 'date-fns';
import type { ConversationListItem } from '@/types/conversation';

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  // Helper to get display name (for direct chats without title)
  const getDisplayName = () => {
    if (conversation.title) return conversation.title;
    // For direct chats, show the other participant's name
    const otherParticipant = conversation.participants.find((p) => p.role !== 'owner');
    return otherParticipant?.user.displayName || otherParticipant?.user.username || 'Unknown';
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-blue-50' : ''
      }`}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium shrink-0">
        {conversation.type === 'group' ? (
          <span className="text-lg">👥</span>
        ) : (
          <span className="text-lg">👤</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-center">
          <span className="font-medium truncate">{getDisplayName()}</span>
          {conversation.lastMessage && (
            <span className="text-xs text-gray-500 shrink-0 ml-2">
              {format(new Date(conversation.lastMessage.createdAt), 'HH:mm')}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-500 truncate">
            {conversation.lastMessage?.content || 'No messages yet'}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center shrink-0 ml-2">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
