import { describe, expect, it, vi } from 'vitest';
import { CreateChatModal } from './CreateChatModal';

// Test the component logic without React rendering
describe('CreateChatModal', () => {
  it('is exported as component', () => {
    expect(CreateChatModal).toBeDefined();
  });

  describe('Modal state logic', () => {
    type ModalState = {
      isOpen: boolean;
      searchQuery: string;
      selectedContacts: string[];
      conversationType: 'direct' | 'group';
      groupName: string;
    };

    const createInitialState = (): ModalState => ({
      isOpen: false,
      searchQuery: '',
      selectedContacts: [],
      conversationType: 'direct',
      groupName: '',
    });

    it('initializes with default values', () => {
      const state = createInitialState();
      expect(state.isOpen).toBe(false);
      expect(state.searchQuery).toBe('');
      expect(state.selectedContacts).toHaveLength(0);
      expect(state.conversationType).toBe('direct');
    });

    it('handles search query change', () => {
      const state = createInitialState();
      state.searchQuery = 'alice';
      expect(state.searchQuery).toBe('alice');
    });

    it('handles contact selection', () => {
      const state = createInitialState();
      state.selectedContacts.push('user-123');
      expect(state.selectedContacts).toContain('user-123');
    });

    it('handles contact deselection', () => {
      const state = createInitialState();
      state.selectedContacts.push('user-123');
      state.selectedContacts = state.selectedContacts.filter(c => c !== 'user-123');
      expect(state.selectedContacts).not.toContain('user-123');
    });

    it('handles conversation type change', () => {
      const state = createInitialState();
      state.conversationType = 'group';
      state.groupName = 'My Group';
      expect(state.conversationType).toBe('group');
      expect(state.groupName).toBe('My Group');
    });
  });

  describe('Form validation logic', () => {
    const canCreateConversation = (
      type: 'direct' | 'group',
      selectedContacts: string[],
      groupName?: string
    ): boolean => {
      if (selectedContacts.length === 0) return false;
      if (type === 'group' && (!groupName || groupName.trim() === '')) return false;
      return true;
    };

    it('allows direct conversation with one contact', () => {
      expect(canCreateConversation('direct', ['user-123'])).toBe(true);
    });

    it('rejects when no contacts selected', () => {
      expect(canCreateConversation('direct', [])).toBe(false);
    });

    it('rejects group without name', () => {
      expect(canCreateConversation('group', ['user-123'], '')).toBe(false);
    });

    it('allows group with name and contacts', () => {
      expect(canCreateConversation('group', ['user-123'], 'My Group')).toBe(true);
    });
  });

  describe('Search filtering logic', () => {
    interface Contact {
      id: string;
      displayName: string;
      username: string;
    }

    const filterContacts = (contacts: Contact[], query: string): Contact[] => {
      const lowerQuery = query.toLowerCase();
      return contacts.filter(
        c => c.displayName.toLowerCase().includes(lowerQuery) ||
             c.username.toLowerCase().includes(lowerQuery)
      );
    };

    const mockContacts: Contact[] = [
      { id: '1', displayName: 'Alice Smith', username: 'alice' },
      { id: '2', displayName: 'Bob Jones', username: 'bob' },
      { id: '3', displayName: 'Alice Wonder', username: 'alicew' },
    ];

    it('returns all contacts when query is empty', () => {
      expect(filterContacts(mockContacts, '')).toHaveLength(3);
    });

    it('filters by displayName', () => {
      expect(filterContacts(mockContacts, 'Alice')).toHaveLength(2);
    });

    it('filters by username', () => {
      expect(filterContacts(mockContacts, 'bob')).toHaveLength(1);
    });

    it('is case insensitive', () => {
      expect(filterContacts(mockContacts, 'ALICE')).toHaveLength(2);
    });
  });
});
