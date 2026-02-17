import { useCallback, useEffect, useRef } from 'react';

interface UseTypingIndicatorOptions {
  conversationId?: string;
  onTypingStart: (conversationId: string) => void;
  onTypingStop: (conversationId: string) => void;
  delayMs?: number;
}

export function useTypingIndicator({
  conversationId,
  onTypingStart,
  onTypingStop,
  delayMs = 1200,
}: UseTypingIndicatorOptions) {
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTypingRef.current) {
      return;
    }
    isTypingRef.current = false;
    onTypingStop(conversationId);
  }, [conversationId, onTypingStop]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onInputActivity = useCallback(
    (value: string) => {
      if (!conversationId) {
        return;
      }

      const hasText = value.trim().length > 0;
      if (!hasText) {
        clearTimer();
        stopTyping();
        return;
      }

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStart(conversationId);
      }

      clearTimer();
      timeoutRef.current = window.setTimeout(() => {
        stopTyping();
      }, delayMs);
    },
    [clearTimer, conversationId, delayMs, onTypingStart, stopTyping]
  );

  useEffect(() => {
    return () => {
      clearTimer();
      stopTyping();
    };
  }, [clearTimer, stopTyping]);

  return {
    onInputActivity,
  };
}
