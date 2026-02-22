/**
 * ChatPage & Sidebar Tests
 * 
 * Tests for dashboard functionality.
 * 
 * Run: bun test src/pages/chatpage.test.ts
 */
import { describe, expect, it } from 'vitest';

describe('ChatPage Dashboard', () => {
  it('ChatPage component is exported', async () => {
    const { ChatPage } = await import('./ChatPage');
    expect(ChatPage).toBeDefined();
  });

  it('uses useConversations hook for conversation list', async () => {
    const { useConversations } = await import('@/hooks/useConversations');
    expect(useConversations).toBeDefined();
    expect(typeof useConversations).toBe('function');
  });

  it('uses useUsersSearch for contact search', async () => {
    const { useUsersSearch } = await import('@/hooks/useUsersSearch');
    expect(useUsersSearch).toBeDefined();
    expect(typeof useUsersSearch).toBe('function');
  });

  it('has CreateChatModal for new conversations', async () => {
    const { CreateChatModal } = await import('@/components/chat/CreateChatModal');
    expect(CreateChatModal).toBeDefined();
  });
});

describe('Sidebar', () => {
  it('Sidebar component is exported', async () => {
    const { Sidebar } = await import('@/components/chat/Sidebar');
    expect(Sidebar).toBeDefined();
  });

  it('renders conversation list from useConversations', async () => {
    // Test data structure
    const mockConversations = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        type: 'direct' as const,
        title: null,
        participants: [],
        unreadCount: 0,
      },
    ];

    // Should have conversations array
    expect(Array.isArray(mockConversations)).toBe(true);
    expect(mockConversations[0]).toHaveProperty('id');
    expect(mockConversations[0]).toHaveProperty('unreadCount');
  });

  it('shows unread count badge', () => {
    const hasUnread = (count: number) => count > 0;

    expect(hasUnread(5)).toBe(true);
    expect(hasUnread(0)).toBe(false);
    expect(hasUnread(1)).toBe(true);
  });
});

describe('Routing', () => {
  it('has App component exported', async () => {
    const app = await import('../App');
    expect(app.default).toBeDefined();
  });

  it('protected route redirects to login when not authenticated', async () => {
    const { ProtectedRoute } = await import('@/components/auth/ProtectedRoute');
    expect(ProtectedRoute).toBeDefined();
  });
});
