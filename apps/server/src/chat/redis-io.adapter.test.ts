import { describe, expect, it } from 'vitest';
import { isAllowedWebSocketOrigin } from './redis-io.adapter';

describe('isAllowedWebSocketOrigin', () => {
  const allowedOrigin = 'https://chat.naufaldi.com';

  it('allows the configured browser origin', () => {
    expect(isAllowedWebSocketOrigin(allowedOrigin, allowedOrigin)).toBe(true);
    expect(isAllowedWebSocketOrigin(`${allowedOrigin}/`, allowedOrigin)).toBe(true);
  });

  it('rejects missing, malformed, and unrelated origins', () => {
    expect(isAllowedWebSocketOrigin(undefined, allowedOrigin)).toBe(false);
    expect(isAllowedWebSocketOrigin('not-a-url', allowedOrigin)).toBe(false);
    expect(isAllowedWebSocketOrigin('https://evil.example', allowedOrigin)).toBe(false);
  });
});
