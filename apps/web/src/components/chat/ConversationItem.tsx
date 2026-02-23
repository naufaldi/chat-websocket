import { format } from 'date-fns';
import { MoreVertical, Trash2, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ConversationListItem } from '@/types/conversation';
import { useAuthContext } from '@/contexts/AuthContext';

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onClick: () => void;
  onLeave?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ConversationItem({ conversation, isActive, onClick, onLeave, onDelete }: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to get display name (for direct chats without title)
  const getDisplayName = () => {
    if (conversation.title) return conversation.title;
    const otherParticipant = conversation.participants.find((p) => p.user.id !== user?.id);
    if (!otherParticipant) {
      const fallback = conversation.participants[0];
      return fallback?.user.displayName || fallback?.user.username || 'Direct Chat';
    }
    return otherParticipant?.user.displayName || otherParticipant?.user.username || 'Unknown';
  };

  return (
    <div className="relative group">
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

      {/* Menu button */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 bg-white shadow-lg rounded-lg border py-1 z-10 min-w-[120px]">
            {conversation.type === 'group' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLeave?.(conversation.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(conversation.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-500"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
