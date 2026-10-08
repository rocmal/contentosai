import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPasswordHasher } from '@shared/security/password-hasher.interface';
import { User, UserStatus } from '../../domain/entities/user.entity';
import { IUsersRepository } from '../../domain/repositories/user-repository.interface';
import { UsersService } from './users.service';

describe('UsersService.deleteOwnAccount', () => {
  let service: UsersService;
  let repository: jest.Mocked<IUsersRepository>;
  let hasher: jest.Mocked<IPasswordHasher>;

  const withPassword = { id: 'u1', email: 'a@b.com', passwordHash: 'hash' } as User;
  const socialOnly = { id: 'u2', email: 'c@d.com', passwordHash: null } as User;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IUsersRepository>;
    hasher = { hash: jest.fn(), compare: jest.fn() };
    service = new UsersService(repository, hasher, new EventEmitter2());
  });

  it('refuses a wrong password and changes nothing', async () => {
    repository.findById.mockResolvedValue(withPassword);
    hasher.compare.mockResolvedValue(false);

    await expect(service.deleteOwnAccount('u1', 'nope')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('refuses a missing password when the account has one', async () => {
    repository.findById.mockResolvedValue(withPassword);

    await expect(service.deleteOwnAccount('u1')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('anonymises then soft-deletes when the password is right', async () => {
    repository.findById.mockResolvedValue(withPassword);
    hasher.compare.mockResolvedValue(true);

    await service.deleteOwnAccount('u1', 'correct');

    expect(repository.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        email: 'deleted+u1@deleted.invalid',
        passwordHash: null,
        avatarUrl: null,
        status: UserStatus.SUSPENDED,
      }),
      'u1',
    );
    expect(repository.delete).toHaveBeenCalledWith('u1', 'u1');
  });

  it('lets a social-sign-in account (no password) delete itself', async () => {
    repository.findById.mockResolvedValue(socialOnly);

    await service.deleteOwnAccount('u2');

    expect(hasher.compare).not.toHaveBeenCalled();
    expect(repository.delete).toHaveBeenCalledWith('u2', 'u2');
  });
});
