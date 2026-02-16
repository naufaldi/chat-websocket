import { format } from 'date-fns';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isSent: boolean;
  isRead?: boolean;
}

export function MessageBubble({ content, timestamp, isSent, isRead }: MessageBubbleProps) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2`}>
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
    </div>
  );
}
