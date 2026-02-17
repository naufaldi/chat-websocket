import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTypingIndicator } from './useTypingIndicator';

describe('useTypingIndicator', () => {
  it('emits typing start once and delayed typing stop', () => {
    vi.useFakeTimers();

    const onTypingStart = vi.fn();
    const onTypingStop = vi.fn();

    const { result, unmount } = renderHook(() =>
      useTypingIndicator({
        conversationId: '11111111-1111-1111-1111-111111111111',
        onTypingStart,
        onTypingStop,
        delayMs: 1200,
      })
    );

    act(() => {
      result.current.onInputActivity('h');
      result.current.onInputActivity('he');
    });

    expect(onTypingStart).toHaveBeenCalledTimes(1);
    expect(onTypingStop).toHaveBeenCalledTimes(0);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(onTypingStop).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');

    unmount();
    vi.useRealTimers();
  });

  it('stops immediately when input is cleared', () => {
    const onTypingStart = vi.fn();
    const onTypingStop = vi.fn();

    const { result } = renderHook(() =>
      useTypingIndicator({
        conversationId: '11111111-1111-1111-1111-111111111111',
        onTypingStart,
        onTypingStop,
      })
    );

    act(() => {
      result.current.onInputActivity('hello');
      result.current.onInputActivity('');
    });

    expect(onTypingStart).toHaveBeenCalledTimes(1);
    expect(onTypingStop).toHaveBeenCalledTimes(1);
  });
});
