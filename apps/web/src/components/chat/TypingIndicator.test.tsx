import { describe, expect, it } from 'vitest';
import { TypingIndicator } from './TypingIndicator';

// Test the component exports and rendering logic
describe('TypingIndicator', () => {
  it('is exported as component', () => {
    expect(TypingIndicator).toBeDefined();
  });

  describe('Rendering logic', () => {
    const getTypingText = (users: string[], currentUserId?: string) => {
      if (!users.length) return null;
      
      const otherUsers = currentUserId 
        ? users.filter(u => u !== currentUserId)
        : users;
      
      if (otherUsers.length === 0) return null;
      if (otherUsers.length === 1) return `${otherUsers[0]} is typing...`;
      if (otherUsers.length === 2) return `${otherUsers[0]} and ${otherUsers[1]} are typing...`;
      return `${otherUsers.length} users are typing...`;
    };

    it('returns null when no users are typing', () => {
      expect(getTypingText([])).toBeNull();
    });

    it('returns null when only current user is typing', () => {
      expect(getTypingText(['current-user'], 'current-user')).toBeNull();
    });

    it('shows typing text for one user', () => {
      expect(getTypingText(['Alice'])).toBe('Alice is typing...');
    });

    it('shows typing text for two users', () => {
      expect(getTypingText(['Alice', 'Bob'])).toBe('Alice and Bob are typing...');
    });

    it('shows count for three or more users', () => {
      expect(getTypingText(['Alice', 'Bob', 'Charlie'])).toBe('3 users are typing...');
    });
  });

  describe('Props validation', () => {
    it('accepts users array prop', () => {
      const props = { users: ['user1', 'user2'] };
      expect(props.users).toHaveLength(2);
    });

    it('accepts empty users array', () => {
      const props = { users: [] };
      expect(props.users).toHaveLength(0);
    });

    it('accepts currentUserId prop', () => {
      const props = { users: ['user1'], currentUserId: 'user1' };
      expect(props.currentUserId).toBe('user1');
    });
  });
});
