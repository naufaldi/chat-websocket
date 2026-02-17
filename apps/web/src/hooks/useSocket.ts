import { useEffect, useMemo, useState } from 'react';
import { chatSocketService, type ChatSocketService, type SocketConnectionStatus } from '@/lib/socket';

interface UseSocketOptions {
  token?: string | null;
  autoConnect?: boolean;
  service?: ChatSocketService;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { token, autoConnect = true, service = chatSocketService } = options;
  const resolvedToken = useMemo(() => token ?? localStorage.getItem('accessToken'), [token]);
  const [status, setStatus] = useState<SocketConnectionStatus>(() => service.getStatus());

  useEffect(() => {
    return service.onConnectionStatusChange(setStatus);
  }, [service]);

  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    if (!resolvedToken) {
      service.disconnect();
      return;
    }

    service.connect(resolvedToken);
    return () => {
      service.disconnect();
    };
  }, [autoConnect, resolvedToken, service]);

  return {
    status,
    isConnected: status === 'connected',
  };
}
