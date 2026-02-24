import { MoreVertical, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { PresenceIndicator, PresenceText } from '@/components/ui/PresenceIndicator';
import type { UserPresenceResponse } from '@chat/shared/schemas/presence';

interface ChatHeaderProps {
  name: string;
  presence?: UserPresenceResponse | null;
  participantCount?: number;
  connectionStatus?: ReactNode;
}

export function ChatHeader({ name, presence, participantCount, connectionStatus }: ChatHeaderProps) {
  const isGroup = participantCount !== undefined && participantCount > 2;

  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-3">
        {/* Avatar with presence indicator */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            {isGroup ? (
              <Users className="w-5 h-5 text-gray-600" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          {!isGroup && (
            <PresenceIndicator
              status={presence?.status}
              size="md"
              className="absolute bottom-0 right-0"
            />
          )}
        </div>

        {/* Name and status */}
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {isGroup ? (
              <span>{participantCount} participants</span>
            ) : (
              <PresenceText status={presence?.status} lastSeenAt={presence?.lastSeenAt} />
            )}
            {connectionStatus}
          </div>
        </div>
      </div>

      {/* Actions */}
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
