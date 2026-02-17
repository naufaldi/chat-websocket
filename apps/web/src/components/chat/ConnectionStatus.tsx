import { type SocketConnectionStatus } from '@/lib/socket';

interface ConnectionStatusProps {
  status: SocketConnectionStatus;
}

const STATUS_LABELS: Record<SocketConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  reconnecting: 'Reconnecting...',
  disconnected: 'Disconnected',
};

const STATUS_COLORS: Record<SocketConnectionStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500',
  reconnecting: 'bg-yellow-500',
  disconnected: 'bg-gray-400',
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
      <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
      <span>{STATUS_LABELS[status]}</span>
    </div>
  );
}
