import { useState } from 'react';
import { Check, CheckCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadReceiptWithUser } from '@chat/shared/schemas/read-receipt';

interface ReadReceiptProps {
  isRead: boolean;
  isDelivered?: boolean;
  className?: string;
}

export function ReadReceipt({ isRead, isDelivered = true, className }: ReadReceiptProps) {
  // Single checkmark for delivered, double for read
  const Icon = isRead ? CheckCheck : Check;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        isRead ? 'text-blue-500' : 'text-gray-400',
        className
      )}
      aria-label={isRead ? 'Message read' : isDelivered ? 'Message delivered' : 'Message sent'}
    >
      <Icon className="w-4 h-4" />
    </span>
  );
}

interface ReadReceiptDetailsProps {
  receipts: ReadReceiptWithUser[];
  isOpen: boolean;
  onClose: () => void;
}

function formatReadTime(readAt: string): string {
  const date = new Date(readAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export function ReadReceiptDetails({ receipts, isOpen, onClose }: ReadReceiptDetailsProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-96 sm:rounded-lg rounded-t-lg max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Read by</h3>
          <p className="text-sm text-gray-500">{receipts.length} people</p>
        </div>

        <div className="overflow-y-auto max-h-[50vh]">
          {receipts.length === 0 ? (
            <p className="p-4 text-center text-gray-500">No one has read this message yet</p>
          ) : (
            <ul className="divide-y">
              {receipts.map(receipt => (
                <li key={receipt.userId} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white font-medium">
                    {receipt.user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{receipt.user.displayName}</p>
                    <p className="text-sm text-gray-500">@{receipt.user.username}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatReadTime(receipt.readAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReadReceiptCountProps {
  readCount: number;
  totalCount: number;
  onClick?: () => void;
  className?: string;
}

export function ReadReceiptCount({ readCount, totalCount, onClick, className }: ReadReceiptCountProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (totalCount <= 2) {
    // For 1:1 chats, just show the double checkmark
    return <ReadReceipt isRead={readCount >= 1} />;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowDetails(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors',
          className
        )}
        aria-label={`Read by ${readCount} of ${totalCount} people`}
      >
        <CheckCheck className="w-4 h-4" />
        <span className="flex items-center gap-0.5">
          <Users className="w-3 h-3" />
          {readCount}/{totalCount}
        </span>
      </button>

      {/* Note: The actual ReadReceiptDetails would need the receipts data passed to it */}
      {/* This is a placeholder for the modal that would show who read the message */}
    </>
  );
}
