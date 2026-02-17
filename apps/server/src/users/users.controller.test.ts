import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userSearchResponseSchema } from '@chat/shared';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const repository = {
    searchPublicUsers: vi.fn(),
  };
  let controller: UsersController;

  beforeEach(() => {
    repository.searchPublicUsers.mockReset();
    controller = new UsersController(repository as never);
  });

  it('rejects short search queries', async () => {
    await expect(
      controller.searchUsers({ user: { userId: '11111111-1111-4111-8111-111111111111' } }, 'ab', 20)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns schema-valid search response and applies safe limit', async () => {
    repository.searchPublicUsers.mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
      },
    ]);

    const result = await controller.searchUsers(
      { user: { userId: '11111111-1111-4111-8111-111111111111' } },
      'ali',
      100
    );

    expect(userSearchResponseSchema.parse(result)).toEqual(result);
    expect(repository.searchPublicUsers).toHaveBeenCalledWith(
      'ali',
      '11111111-1111-4111-8111-111111111111',
      50
    );
  });
});
