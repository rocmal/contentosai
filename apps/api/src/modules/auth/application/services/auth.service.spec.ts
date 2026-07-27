import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UsersService } from '@modules/users/application/services/users.service';
import { RolesService } from '@modules/roles/application/services/roles.service';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import { IPasswordHasher } from '@shared/security/password-hasher.interface';
import { IOrganizationMembersRepository } from '@modules/organizations/domain/repositories/organization-member-repository.interface';
import { IRefreshTokensRepository } from '../../domain/repositories/refresh-token-repository.interface';
import { IEmailVerificationTokensRepository } from '../../domain/repositories/email-verification-token-repository.interface';
import { IPasswordResetTokensRepository } from '../../domain/repositories/password-reset-token-repository.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let rolesService: jest.Mocked<RolesService>;
  let tokenService: jest.Mocked<TokenService>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let organizationMembersRepository: jest.Mocked<IOrganizationMembersRepository>;
  let refreshTokensRepository: jest.Mocked<IRefreshTokensRepository>;
  let emailVerificationTokensRepository: jest.Mocked<IEmailVerificationTokensRepository>;
  let passwordResetTokensRepository: jest.Mocked<IPasswordResetTokensRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const activeUser = {
    id: 'user-1',
    email: 'jane@lumora.ai',
    passwordHash: 'hashed-password',
    firstName: 'Jane',
    lastName: 'Doe',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    version: 0,
  };

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findEntityById: jest.fn(),
      recordLogin: jest.fn(),
      markEmailVerified: jest.fn(),
      setPassword: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    rolesService = { findById: jest.fn() } as unknown as jest.Mocked<RolesService>;

    tokenService = {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
      signRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      verifyRefreshToken: jest.fn(),
      hashToken: jest.fn().mockReturnValue('hashed-refresh-token'),
      generateOpaqueToken: jest.fn().mockReturnValue({ token: 'raw-token', hash: 'hashed-token' }),
      getRefreshTokenExpiryDate: jest.fn().mockReturnValue(new Date(Date.now() + 1000 * 60)),
      getOpaqueTokenExpiryDate: jest.fn().mockReturnValue(new Date(Date.now() + 1000 * 60)),
    } as unknown as jest.Mocked<TokenService>;

    passwordHasher = { hash: jest.fn(), compare: jest.fn() };
    organizationMembersRepository = {
      listByUser: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IOrganizationMembersRepository>;
    refreshTokensRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    } as unknown as jest.Mocked<IRefreshTokensRepository>;
    emailVerificationTokensRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      consume: jest.fn(),
    } as unknown as jest.Mocked<IEmailVerificationTokensRepository>;
    passwordResetTokensRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      consume: jest.fn(),
    } as unknown as jest.Mocked<IPasswordResetTokensRepository>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    authService = new AuthService(
      usersService,
      rolesService,
      tokenService,
      eventEmitter,
      passwordHasher,
      organizationMembersRepository,
      refreshTokensRepository,
      emailVerificationTokensRepository,
      passwordResetTokensRepository,
    );

    usersService.findEntityById.mockResolvedValue(activeUser);
  });

  describe('login', () => {
    it('issues tokens when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      passwordHasher.compare.mockResolvedValue(true);

      const result = await authService.login({
        email: activeUser.email,
        password: 'correct-password',
      });

      expect(passwordHasher.compare).toHaveBeenCalledWith(
        'correct-password',
        activeUser.passwordHash,
      );
      expect(usersService.recordLogin).toHaveBeenCalledWith(activeUser.id);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@lumora.ai', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      passwordHasher.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: activeUser.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a suspended account even with the correct password', async () => {
      usersService.findByEmail.mockResolvedValue({ ...activeUser, status: UserStatus.SUSPENDED });
      passwordHasher.compare.mockResolvedValue(true);

      await expect(
        authService.login({ email: activeUser.email, password: 'correct-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('creates the user, requests email verification and issues tokens', async () => {
      usersService.create.mockResolvedValue({
        id: activeUser.id,
        email: activeUser.email,
        firstName: activeUser.firstName,
        lastName: activeUser.lastName,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: activeUser.createdAt,
        updatedAt: activeUser.updatedAt,
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      });

      const result = await authService.register({
        email: activeUser.email,
        password: 'a-strong-password',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(usersService.create).toHaveBeenCalled();
      expect(emailVerificationTokensRepository.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auth.email-verification-requested',
        expect.objectContaining({ userId: activeUser.id }),
      );
      expect(result.accessToken).toBe('access-token');
    });
  });
});
