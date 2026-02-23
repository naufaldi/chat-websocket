import type { PresenceStatus } from '@chat/shared/schemas/socket';
import { cn } from '@/lib/utils';

interface PresenceIndicatorProps {
  status: PresenceStatus | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function PresenceIndicator({
  status,
  size = 'md',
  className,
}: PresenceIndicatorProps) {
  const effectiveStatus = status || 'offline';

  return (
    <span
      className={cn(
        'inline-block rounded-full border-2 border-white',
        statusColors[effectiveStatus],
        sizeClasses[size],
        className
      )}
      aria-label={`Status: ${effectiveStatus}`}
      role="status"
    />
  );
}

interface PresenceTextProps {
  status: PresenceStatus | null | undefined;
  lastSeenAt?: string | null;
  className?: string;
}

function formatLastSeen(lastSeenAt: string): string {
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Last seen just now';
  } else if (diffMinutes < 60) {
    return `Last seen ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `Last seen ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `Last seen ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return `Last seen ${lastSeen.toLocaleDateString()}`;
  }
}

export function PresenceText({ status, lastSeenAt, className }: PresenceTextProps) {
  const effectiveStatus = status || 'offline';

  const text = (() => {
    switch (effectiveStatus) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'offline':
        return lastSeenAt ? formatLastSeen(lastSeenAt) : 'Offline';
      default:
        return 'Offline';
    }
  })();

  const textColorClass = (() => {
    switch (effectiveStatus) {
      case 'online':
        return 'text-green-600';
      case 'away':
        return 'text-yellow-600';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  })();

  return (
    <span className={cn('text-sm', textColorClass, className)}>
      {text}
    </span>
  );
}
