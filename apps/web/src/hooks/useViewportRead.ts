import { useEffect, useRef, useCallback } from 'react';
import { useMarkAsRead } from './useReadReceipts';

interface UseViewportReadOptions {
  conversationId: string;
  messageId: string;
  isOwnMessage: boolean;
  isRead: boolean;
  debounceMs?: number;
}

/**
 * Hook for auto-marking messages as read when they come into viewport
 * Uses IntersectionObserver with debounce to prevent spam
 */
export function useViewportRead({
  conversationId,
  messageId,
  isOwnMessage,
  isRead,
  debounceMs = 1000,
}: UseViewportReadOptions) {
  const { markAsRead } = useMarkAsRead();
  const hasMarkedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const markAsReadDebounced = useCallback(() => {
    // Don't mark if already read, is own message, or already marked in this session
    if (isRead || isOwnMessage || hasMarkedRef.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set debounce timer
    debounceTimerRef.current = setTimeout(() => {
      markAsRead(conversationId, messageId);
      hasMarkedRef.current = true;
    }, debounceMs);
  }, [conversationId, messageId, isRead, isOwnMessage, markAsRead, debounceMs]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || isRead || isOwnMessage) return;

    // Create IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            markAsReadDebounced();
          }
        });
      },
      {
        threshold: 0.5, // Message must be 50% visible
        rootMargin: '0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [markAsReadDebounced, isRead, isOwnMessage]);

  // Reset hasMarked when messageId changes (for reuse in lists)
  useEffect(() => {
    hasMarkedRef.current = false;
  }, [messageId]);

  return elementRef;
}
