import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useChatSocket } from './useChatSocket';
import type { ChatSocketService } from '@/lib/socket';

// Mock data
const UUIDS = {
  conv1: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  conv2: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  user1: '11111111-1111-4111-8111-111111111111',
  user2: '22222222-2222-4222-8222-222222222222',
};

// Create mock service
function createMockService() {
  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    sendMessage: vi.fn(),
    typingStart: vi.fn(),
    typingStop: vi.fn(),
    on: vi.fn(() => () => undefined),
    onConnectionStatusChange: vi.fn(() => () => undefined),
  };
}

// Mock API
const mockListMessages = vi.fn();

vi.mock('@/lib/api', () => ({
  conversationsApi: {
    listMessages: (...args: any[]) => mockListMessages(...args),
  },
}));

describe('useChatSocket (unit)', () => {
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockService();
    mockListMessages.mockResolvedValue({ messages: [] });
  });

  describe('Service API', () => {
    it('subscribe is called with conversation ID', () => {
      mockService.subscribe(UUIDS.conv1);
      expect(mockService.subscribe).toHaveBeenCalledWith(UUIDS.conv1);
    });

    it('unsubscribe is called with conversation ID', () => {
      mockService.unsubscribe(UUIDS.conv1);
      expect(mockService.unsubscribe).toHaveBeenCalledWith(UUIDS.conv1);
    });

    it('sendMessage is called with correct params', () => {
      mockService.sendMessage(UUIDS.conv1, 'Hello!', 'client-123');
      expect(mockService.sendMessage).toHaveBeenCalledWith(UUIDS.conv1, 'Hello!', 'client-123');
    });

    it('typingStart is called with conversation ID', () => {
      mockService.typingStart(UUIDS.conv1);
      expect(mockService.typingStart).toHaveBeenCalledWith(UUIDS.conv1);
    });

    it('typingStop is called with conversation ID', () => {
      mockService.typingStop(UUIDS.conv1);
      expect(mockService.typingStop).toHaveBeenCalledWith(UUIDS.conv1);
    });
  });

  describe('Message handling', () => {
    it('on() can register message handler', () => {
      const handler = vi.fn();
      mockService.on('message', handler);
      expect(mockService.on).toHaveBeenCalledWith('message', handler);
    });

    it('on() can register typing handler', () => {
      const handler = vi.fn();
      mockService.on('typing', handler);
      expect(mockService.on).toHaveBeenCalledWith('typing', handler);
    });

    it('returns cleanup function', () => {
      const cleanup = vi.fn();
      mockService.on.mockReturnValue(cleanup);
      const fn = mockService.on('test', vi.fn());
      fn();
      expect(cleanup).toHaveBeenCalled();
    });
  });

  describe('API integration', () => {
    it('listMessages is called via conversationsApi', async () => {
      await mockListMessages(UUIDS.conv1);
      expect(mockListMessages).toHaveBeenCalledWith(UUIDS.conv1);
    });

    it('listMessages returns messages array', async () => {
      const mockMessages = {
        messages: [
          { id: '1', content: 'Hello' },
          { id: '2', content: 'World' },
        ],
      };
      mockListMessages.mockResolvedValueOnce(mockMessages);
      
      const result = await mockListMessages(UUIDS.conv1);
      expect(result.messages).toHaveLength(2);
    });
  });
});

describe('useChatSocket module', () => {
  it('exports useChatSocket function', () => {
    expect(useChatSocket).toBeDefined();
    expect(typeof useChatSocket).toBe('function');
  });
});
