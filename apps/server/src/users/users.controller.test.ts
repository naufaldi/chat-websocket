import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

describe('UsersController', () => {
  let controller: UsersController;
  let repository: UsersRepository;

  beforeEach(() => {
    repository = {
      searchPublicUsers: vi.fn(),
    } as unknown as UsersRepository;
    controller = new UsersController(repository);
  });

  describe('searchUsers', () => {
    it('should return empty array for query less than 3 characters', async () => {
      const result = await controller.searchUsers(
        { user: { userId: 'user1' } },
        'ab',
        '20',
      );

      expect(result.users).toEqual([]);
    });

    it('should search with valid query', async () => {
      const mockUsers = [
        { id: '1', username: 'john', displayName: 'John Doe', avatarUrl: null },
      ];
      vi.mocked(repository.searchPublicUsers).mockResolvedValue(mockUsers);

      const result = await controller.searchUsers(
        { user: { userId: 'user1' } },
        'john',
        '20',
      );

      expect(repository.searchPublicUsers).toHaveBeenCalledWith('john', 'user1', 20);
      expect(result.users).toEqual(mockUsers);
    });

    it('should clamp limit to minimum of 1', async () => {
      vi.mocked(repository.searchPublicUsers).mockResolvedValue([]);

      await controller.searchUsers({ user: { userId: 'user1' } }, 'query', '0');
      expect(repository.searchPublicUsers).toHaveBeenCalledWith('query', 'user1', 1);
    });

    it('should clamp limit to maximum of 50', async () => {
      vi.mocked(repository.searchPublicUsers).mockResolvedValue([]);

      await controller.searchUsers({ user: { userId: 'user1' } }, 'query', '100');
      expect(repository.searchPublicUsers).toHaveBeenCalledWith('query', 'user1', 50);
    });
  });
});
