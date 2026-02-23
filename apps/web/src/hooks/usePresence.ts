import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PresenceStatus, PresenceUpdateEvent } from '@chat/shared/schemas/socket';
import type { UserPresenceResponse } from '@chat/shared/schemas/presence';
import { chatSocketService } from '@/lib/socket';

// Query keys for presence
export const presenceKeys = {
  all: ['presence'] as const,
  user: (userId: string) => ['presence', 'user', userId] as const,
  currentUser: ['presence', 'current'] as const,
};

// Local state for current user's presence
interface CurrentPresenceState {
  status: PresenceStatus;
  lastActivity: Date | null;
}

// Hook for managing current user's presence (heartbeat, status updates)
export function usePresence() {
  const [currentPresence, setCurrentPresence] = useState<CurrentPresenceState>({
    status: 'online',
    lastActivity: null,
  });

  const setStatus = useCallback((status: PresenceStatus) => {
    setCurrentPresence(prev => ({
      ...prev,
      status,
      lastActivity: status === 'online' ? new Date() : prev.lastActivity,
    }));

    // Send heartbeat via WebSocket
    if (chatSocketService.isConnected()) {
      chatSocketService.emitHeartbeat(status === 'online' ? 'online' : 'away');
    }
  }, []);

  const setOnline = useCallback(() => setStatus('online'), [setStatus]);
  const setAway = useCallback(() => setStatus('away'), [setStatus]);

  // Update presence based on document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setAway();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setOnline, setAway]);

  return {
    status: currentPresence.status,
    lastActivity: currentPresence.lastActivity,
    setStatus,
    setOnline,
    setAway,
  };
}

// Hook for fetching and subscribing to a specific user's presence
export function useUserPresence(userId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: presenceKeys.user(userId || ''),
    queryFn: async (): Promise<UserPresenceResponse | null> => {
      if (!userId) return null;
      // For now, return null until we have a REST endpoint
      // This will be populated via WebSocket events
      return null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Subscribe to presence updates via WebSocket
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = chatSocketService.on('presence:update', (event: PresenceUpdateEvent) => {
      if (event.userId === userId) {
        queryClient.setQueryData(presenceKeys.user(userId), (old: UserPresenceResponse | null) => {
          if (!old) {
            return {
              userId,
              status: event.status,
              lastActivity: new Date().toISOString(),
              lastSeenAt: event.status === 'offline' ? new Date().toISOString() : null,
            };
          }
          return {
            ...old,
            status: event.status,
            lastActivity: new Date().toISOString(),
            lastSeenAt: event.status === 'offline' ? new Date().toISOString() : old.lastSeenAt,
          };
        });
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);

  return {
    presence: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
