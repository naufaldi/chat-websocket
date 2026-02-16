import { Search } from 'lucide-react';
import { useState } from 'react';
import { ConversationItem } from './ConversationItem';
import type { ConversationListItem } from '@/types/conversation';

interface SidebarProps {
  conversations: ConversationListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreateChat: () => void;
  onLeave?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function Sidebar({ conversations, selectedId, onSelect, onCreateChat, onLeave, onDelete }: SidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    const name = c.title || 'Direct Chat';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === selectedId}
            onClick={() => onSelect(conversation.id)}
            onLeave={onLeave}
            onDelete={onDelete}
          />
        ))}
        {filtered.length === 0 && (
          <div className="p-4 text-center text-gray-500">No conversations found</div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="p-4">
        <button
          onClick={onCreateChat}
          className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-600 transition-colors"
        >
          <span className="text-2xl">+</span>
        </button>
      </div>
    </div>
  );
}
