import { useState, type FormEvent } from 'react';
import { X, Search, Check } from 'lucide-react';
import type { CreateConversationInput } from '@chat/shared/schemas/conversation';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateConversationInput) => void;
  // In real app, fetch contacts from API
  contacts?: Array<{ id: string; displayName: string }>;
}

export function CreateChatModal({ isOpen, onClose, onCreate, contacts = [] }: CreateChatModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isGroup && !title.trim()) return;
    if (selectedIds.length === 0) return;

    onCreate({
      type: isGroup ? 'group' : 'direct',
      title: isGroup ? title : undefined,
      participantIds: selectedIds,
    });
    onClose();
  };

  const toggleContact = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-medium">New {isGroup ? 'Group' : 'Chat'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Group toggle */}
          <div className="px-4 py-2 border-b border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-sm">Create group</span>
            </label>
          </div>

          {/* Group title (if group) */}
          {isGroup && (
            <div className="px-4 py-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="Group name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Contact list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => toggleContact(contact.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">👤</div>
                <span className="flex-1 text-left">{contact.displayName}</span>
                {selectedIds.includes(contact.id) && <Check className="w-5 h-5 text-blue-500" />}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              type="submit"
              disabled={!title && isGroup}
              className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
            >
              Create {isGroup ? 'Group' : 'Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
