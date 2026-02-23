import { useState } from 'react';
import { format } from 'date-fns';
import { MoreVertical, Trash2 } from 'lucide-react';
import type { MessageStatus } from '@chat/shared';
import { ReadReceipt } from './ReadReceipt';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isSent: boolean;
  status?: MessageStatus;
  messageId?: string;
  conversationId?: string;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({
  content,
  timestamp,
  isSent,
  status = 'delivered',
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
      <div className="relative max-w-[40%]">
        <div
          className={`relative px-4 py-2 rounded-2xl ${
            isSent
              ? 'bg-[#EFFDDE] rounded-br-md' // Telegram sent (green)
              : 'bg-white border border-gray-200 rounded-bl-md' // Received (white)
          }`}
        >
          {/* Three-dot menu - inside bubble at top right */}
          {isSent && messageId && onDelete && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-200/80 hover:bg-gray-300 rounded-full z-10"
            >
              <MoreVertical className="w-3 h-3 text-gray-600" />
            </button>
          )}

          {/* Delete menu dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}

          <p className="text-sm break-words whitespace-pre-wrap min-w-[60px] pr-6">{content}</p>
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] text-gray-400">
              {format(new Date(timestamp), 'HH:mm')}
            </span>
            {isSent ? <ReadReceipt status={status} className="translate-y-[1px]" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
