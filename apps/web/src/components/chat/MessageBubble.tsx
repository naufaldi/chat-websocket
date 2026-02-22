import { useState } from 'react';
import { format } from 'date-fns';
import { MoreVertical, Trash2 } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isSent: boolean;
  isRead?: boolean;
  messageId?: string;
  conversationId?: string;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({ 
  content, 
  timestamp, 
  isSent, 
  isRead,
  messageId,
  conversationId,
  onDelete,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    if (messageId && onDelete) {
      onDelete(messageId);
      setShowMenu(false);
    }
  };

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className="relative">
        <div
          className={`max-w-[60%] px-4 py-2 rounded-2xl ${
            isSent
              ? 'bg-[#EFFDDE] rounded-br-md' // Telegram sent (green)
              : 'bg-white border border-gray-200 rounded-bl-md' // Received (white)
          }`}
        >
          <p className="text-sm">{content}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] text-gray-400">
              {format(new Date(timestamp), 'HH:mm')}
            </span>
            {isSent && (
              <span className="text-[10px] text-gray-400">{isRead ? '✓✓' : '✓'}</span>
            )}
          </div>
        </div>
        
        {/* Delete button (only for sent messages) */}
        {isSent && messageId && onDelete && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        )}
        
        {/* Delete menu */}
        {showMenu && (
          <div className="absolute right-0 top-0 mt-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
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
