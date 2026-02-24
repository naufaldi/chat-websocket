import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let repository: UsersRepository;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      searchPublicUsers: vi.fn(),
      updateProfile: vi.fn(),
      updatePrivacy: vi.fn(),
    } as unknown as UsersRepository;
    service = {
      updateProfile: vi.fn(),
      updatePrivacy: vi.fn(),
    } as unknown as UsersService;
    controller = new UsersController(repository, service);
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

  describe('updateProfile', () => {
    it('should update profile via service', async () => {
      const mockUser = {
        id: 'user1',
        username: 'john',
        displayName: 'John Updated',
        avatarUrl: null,
        lastSeenAt: null,
      };
      vi.mocked(service.updateProfile).mockResolvedValue(mockUser);

      const result = await controller.updateProfile(
        { user: { userId: 'user1' } },
        { displayName: 'John Updated' },
      );

      expect(service.updateProfile).toHaveBeenCalledWith('user1', { displayName: 'John Updated' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updatePrivacy', () => {
    it('should update privacy via service', async () => {
      const mockPrivacy = { presenceSharing: 'friends' as const };
      vi.mocked(service.updatePrivacy).mockResolvedValue(mockPrivacy);

      const result = await controller.updatePrivacy(
        { user: { userId: 'user1' } },
        { presenceSharing: 'friends' },
      );

      expect(service.updatePrivacy).toHaveBeenCalledWith('user1', { presenceSharing: 'friends' });
      expect(result).toEqual(mockPrivacy);
    });
  });
});
