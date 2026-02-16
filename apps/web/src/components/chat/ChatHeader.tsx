import { MoreVertical } from 'lucide-react';

interface ChatHeaderProps {
  name: string;
  status?: string;
}

export function ChatHeader({ name, status }: ChatHeaderProps) {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-3">
        {/* Avatar with online indicator */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-lg">👤</span>
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        </div>

        {/* Name and status */}
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-500">{status || 'online'}</div>
        </div>
      </div>

      {/* Actions */}
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
