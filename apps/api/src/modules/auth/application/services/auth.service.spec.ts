import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from './auth.service';
import { TRIAL_CREDITS } from '@modules/credits/credits.constants';
import { TokenService } from './token.service';
import { UsersService } from '@modules/users/application/services/users.service';
import { RolesService } from '@modules/roles/application/services/roles.service';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import { IPasswordHasher } from '@shared/security/password-hasher.interface';
import { IOrganizationMembersRepository } from '@modules/organizations/domain/repositories/organization-member-repository.interface';
import { IOrganizationsRepository } from '@modules/organizations/domain/repositories/organization-repository.interface';
import { OrganizationStatus } from '@modules/organizations/domain/entities/organization.entity';
import { IWorkspacesRepository } from '@modules/workspaces/domain/repositories/workspace-repository.interface';
import { WorkspaceStatus } from '@modules/workspaces/domain/entities/workspace.entity';
import { IRolesRepository } from '@modules/roles/domain/repositories/role-repository.interface';
import { ISubscriptionsRepository } from '@modules/billing/domain/repositories/subscription-repository.interface';
import { SubscriptionStatus } from '@modules/billing/domain/entities/subscription.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
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
  let organizationsRepository: jest.Mocked<IOrganizationsRepository>;
  let workspacesRepository: jest.Mocked<IWorkspacesRepository>;
  let rolesRepository: jest.Mocked<IRolesRepository>;
  let subscriptionsRepository: jest.Mocked<ISubscriptionsRepository>;
  let creditsService: jest.Mocked<CreditsService>;
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
      create: jest.fn(),
    } as unknown as jest.Mocked<IOrganizationMembersRepository>;
    workspacesRepository = {
      listByOrganization: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    } as unknown as jest.Mocked<IWorkspacesRepository>;
    organizationsRepository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    } as unknown as jest.Mocked<IOrganizationsRepository>;
    rolesRepository = {
      findBySlug: jest.fn().mockResolvedValue({
        id: 'role-super-admin',
        organizationId: null,
        name: 'Super Admin',
        slug: 'super-admin',
        description: null,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      }),
    } as unknown as jest.Mocked<IRolesRepository>;
    subscriptionsRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ISubscriptionsRepository>;
    creditsService = {
      grantInitial: jest.fn(),
    } as unknown as jest.Mocked<CreditsService>;
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
      creditsService,
      passwordHasher,
      organizationMembersRepository,
      organizationsRepository,
      workspacesRepository,
      rolesRepository,
      subscriptionsRepository,
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
    beforeEach(() => {
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
      organizationsRepository.create.mockResolvedValue({
        id: 'org-1',
        name: "Jane's Workspace",
        slug: 'jane-abc123',
        ownerId: activeUser.id,
        status: OrganizationStatus.ACTIVE,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: activeUser.id,
        updatedBy: activeUser.id,
        version: 0,
      });
      workspacesRepository.create.mockResolvedValue({
        id: 'workspace-1',
        organizationId: 'org-1',
        name: 'Default',
        slug: 'default',
        description: null,
        status: WorkspaceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: activeUser.id,
        updatedBy: activeUser.id,
        version: 0,
      });
    });

    it('opens an account for a customer without a password, with a 7-day link to choose one', async () => {
      const result = await authService.createAccountForCustomer(
        {
          email: activeUser.email,
          firstName: 'Jane',
          lastName: 'Doe',
          organizationName: 'Doe Insurance',
          sendEmail: true,
        },
        'admin-1',
      );

      expect(usersService.create).toHaveBeenCalledWith(
        { email: activeUser.email, firstName: 'Jane', lastName: 'Doe' },
        'admin-1',
      );
      expect(organizationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Doe Insurance',
          slug: expect.stringMatching(/^doe-insurance-/),
        }),
        activeUser.id,
      );
      expect(creditsService.grantInitial).toHaveBeenCalledWith(
        'org-1',
        'workspace-1',
        expect.any(String),
        activeUser.id,
        TRIAL_CREDITS,
      );
      expect(tokenService.getOpaqueTokenExpiryDate).toHaveBeenCalledWith('7d');
      expect(passwordResetTokensRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: activeUser.id, tokenHash: 'hashed-token' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auth.account-created-for-customer',
        expect.objectContaining({ email: activeUser.email, token: 'raw-token' }),
      );
      expect(result).toEqual({
        userId: activeUser.id,
        organizationId: 'org-1',
        setPasswordLink: '/reset-password?token=raw-token&welcome=1',
      });
      // Nobody is signed in as the new customer.
      expect(refreshTokensRepository.create).not.toHaveBeenCalled();
    });

    it('can open an account without emailing (the admin shares the link)', async () => {
      await authService.createAccountForCustomer(
        { email: activeUser.email, firstName: 'Jane', lastName: '', sendEmail: false },
        'admin-1',
      );
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'auth.account-created-for-customer',
        expect.anything(),
      );
    });

    it('creates the user, requests email verification and issues tokens', async () => {
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

    it('provisions a personal organization, workspace, membership, subscription and initial credit grant', async () => {
      await authService.register({
        email: activeUser.email,
        password: 'a-strong-password',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(rolesRepository.findBySlug).toHaveBeenCalledWith(null, 'super-admin');
      expect(organizationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Jane's Workspace", ownerId: activeUser.id }),
        activeUser.id,
      );
      expect(workspacesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-1', slug: 'default' }),
        activeUser.id,
      );
      expect(organizationMembersRepository.create).toHaveBeenCalledWith(
        { organizationId: 'org-1', userId: activeUser.id, roleId: 'role-super-admin' },
        activeUser.id,
      );
      expect(subscriptionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          plan: 'starter',
          status: SubscriptionStatus.TRIALING,
        }),
        activeUser.id,
      );
      expect(creditsService.grantInitial).toHaveBeenCalledWith(
        'org-1',
        'workspace-1',
        'starter',
        activeUser.id,
        TRIAL_CREDITS,
      );
    });

    it('does not fail registration when the initial credit grant errors', async () => {
      creditsService.grantInitial.mockRejectedValue(new Error('db unavailable'));

      const result = await authService.register({
        email: activeUser.email,
        password: 'a-strong-password',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.accessToken).toBe('access-token');
    });

    it('retries with a new slug when the first one collides', async () => {
      organizationsRepository.findBySlug.mockResolvedValueOnce({
        id: 'org-existing',
        name: 'Someone Else',
        slug: 'jane-existing',
        ownerId: 'other-user',
        status: OrganizationStatus.ACTIVE,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
      });

      await authService.register({
        email: activeUser.email,
        password: 'a-strong-password',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(organizationsRepository.findBySlug).toHaveBeenCalledTimes(2);
      expect(organizationsRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteAccount', () => {
    const membership = {
      id: 'member-1',
      organizationId: 'org-1',
      userId: 'user-1',
      roleId: 'role-1',
    };

    beforeEach(() => {
      usersService.findEntityById.mockResolvedValue(activeUser);
      (usersService as unknown as { anonymizeAndRemove: jest.Mock }).anonymizeAndRemove = jest.fn();
      (
        organizationMembersRepository as unknown as { listByOrganization: jest.Mock }
      ).listByOrganization = jest.fn();
      (organizationMembersRepository as unknown as { delete: jest.Mock }).delete = jest.fn();
      (organizationsRepository as unknown as { findById: jest.Mock }).findById = jest.fn();
    });

    it('refuses a wrong password and deletes nothing', async () => {
      passwordHasher.compare.mockResolvedValue(false);

      await expect(authService.deleteAccount('user-1', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(usersService.anonymizeAndRemove).not.toHaveBeenCalled();
    });

    it('refuses a missing password when the account has one', async () => {
      await expect(authService.deleteAccount('user-1', undefined)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(passwordHasher.compare).not.toHaveBeenCalled();
    });

    it('refuses an owner whose organization still has other members', async () => {
      passwordHasher.compare.mockResolvedValue(true);
      organizationMembersRepository.listByUser.mockResolvedValue([membership] as never);
      (organizationsRepository.findById as jest.Mock).mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        ownerId: 'user-1',
      });
      (organizationMembersRepository.listByOrganization as jest.Mock).mockResolvedValue([
        membership,
        { ...membership, id: 'member-2', userId: 'user-2' },
      ]);

      await expect(authService.deleteAccount('user-1', 'secret')).rejects.toThrow(
        /still has other members/,
      );
      expect(organizationMembersRepository.delete).not.toHaveBeenCalled();
      expect(usersService.anonymizeAndRemove).not.toHaveBeenCalled();
    });

    it('removes memberships, signs out everywhere and anonymizes the user', async () => {
      passwordHasher.compare.mockResolvedValue(true);
      organizationMembersRepository.listByUser.mockResolvedValue([membership] as never);
      (organizationsRepository.findById as jest.Mock).mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        ownerId: 'someone-else',
      });

      await authService.deleteAccount('user-1', 'secret');

      expect(organizationMembersRepository.delete).toHaveBeenCalledWith('member-1', 'user-1');
      expect(refreshTokensRepository.revokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(usersService.anonymizeAndRemove).toHaveBeenCalledWith('user-1');
    });
  });

  describe('changePassword', () => {
    it('changes it, signs every session out and keeps this one signed in', async () => {
      passwordHasher.compare.mockResolvedValue(true);

      const result = await authService.changePassword('user-1', 'old-password', 'a-new-password');

      expect(usersService.setPassword).toHaveBeenCalledWith('user-1', 'a-new-password');
      expect(refreshTokensRepository.revokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(result.accessToken).toBe('access-token');
    });

    it('refuses a wrong current password and changes nothing', async () => {
      passwordHasher.compare.mockResolvedValue(false);

      await expect(
        authService.changePassword('user-1', 'wrong', 'a-new-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.setPassword).not.toHaveBeenCalled();
      expect(refreshTokensRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('refuses the same password again', async () => {
      passwordHasher.compare.mockResolvedValue(true);

      await expect(
        authService.changePassword('user-1', 'same-password', 'same-password'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersService.setPassword).not.toHaveBeenCalled();
    });
  });

  describe('platform admins', () => {
    const withAdmins = (emails: string[], initialPassword = '') =>
      new AuthService(
        usersService,
        rolesService,
        tokenService,
        eventEmitter,
        creditsService,
        passwordHasher,
        organizationMembersRepository,
        organizationsRepository,
        workspacesRepository,
        rolesRepository,
        subscriptionsRepository,
        refreshTokensRepository,
        emailVerificationTokensRepository,
        passwordResetTokensRepository,
        {
          get: (key: string) =>
            key === 'platform.adminEmails'
              ? emails
              : key === 'platform.initialPassword'
                ? initialPassword
                : undefined,
        } as unknown as ConfigService,
      );

    it('marks only the accounts named in PLATFORM_ADMIN_EMAILS, whatever their case', async () => {
      await expect(
        withAdmins(['jane@lumora.ai']).buildAuthenticatedUser('user-1'),
      ).resolves.toEqual(expect.objectContaining({ isPlatformAdmin: true }));
      usersService.findEntityById.mockResolvedValue({ ...activeUser, email: 'JANE@Lumora.ai' });
      await expect(
        withAdmins(['jane@lumora.ai']).buildAuthenticatedUser('user-1'),
      ).resolves.toEqual(expect.objectContaining({ isPlatformAdmin: true }));
      await expect(
        withAdmins(['someone@else.in']).buildAuthenticatedUser('user-1'),
      ).resolves.toEqual(expect.objectContaining({ isPlatformAdmin: false }));
    });

    it('makes nobody a platform admin when the setting is missing', async () => {
      await expect(authService.buildAuthenticatedUser('user-1')).resolves.toEqual(
        expect.objectContaining({ isPlatformAdmin: false }),
      );
    });

    it('needs a verified email: a stranger who signed up with the address first is not an admin', async () => {
      usersService.findEntityById.mockResolvedValue({ ...activeUser, isEmailVerified: false });
      await expect(
        withAdmins(['jane@lumora.ai']).buildAuthenticatedUser('user-1'),
      ).resolves.toEqual(expect.objectContaining({ isPlatformAdmin: false }));
    });

    describe('creating the admin accounts from the secrets', () => {
      beforeEach(() => {
        usersService.findByEmail.mockResolvedValue(null);
        usersService.create.mockResolvedValue({
          ...activeUser,
          id: 'admin-1',
          email: 'staff@x.in',
        });
        organizationsRepository.create.mockResolvedValue({ id: 'org-a' } as never);
        workspacesRepository.create.mockResolvedValue({ id: 'ws-a' } as never);
      });

      it('creates a verified account with the initial password for an admin email that has none', async () => {
        await expect(
          withAdmins(['staff@x.in'], 'Initial-pass-1').ensurePlatformAdminAccounts(),
        ).resolves.toEqual({ created: 1, unverified: 0 });

        expect(usersService.create).toHaveBeenCalledWith({
          email: 'staff@x.in',
          firstName: 'Lumora',
          lastName: 'Admin',
          password: 'Initial-pass-1',
        });
        expect(organizationsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Lumora Admin' }),
          'admin-1',
        );
        expect(usersService.markEmailVerified).toHaveBeenCalledWith('admin-1');
      });

      it('never changes an account that exists, and reports one that is not verified', async () => {
        usersService.findByEmail.mockResolvedValue({ ...activeUser, isEmailVerified: false });
        await expect(
          withAdmins(['jane@lumora.ai'], 'Initial-pass-1').ensurePlatformAdminAccounts(),
        ).resolves.toEqual({ created: 0, unverified: 1 });
        expect(usersService.create).not.toHaveBeenCalled();
        expect(usersService.setPassword).not.toHaveBeenCalled();
      });

      it('does nothing without a password, or with one shorter than 8 characters', async () => {
        await withAdmins(['staff@x.in']).ensurePlatformAdminAccounts();
        await withAdmins(['staff@x.in'], 'short').ensurePlatformAdminAccounts();
        expect(usersService.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('suspended accounts', () => {
    beforeEach(() => {
      usersService.findEntityById.mockResolvedValue({
        ...activeUser,
        status: UserStatus.SUSPENDED,
      });
    });

    it('are refused on every request, not only at sign-in', async () => {
      await expect(authService.buildAuthenticatedUser('user-1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('cannot renew a session that was still open', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-1' });
      refreshTokensRepository.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      } as never);

      await expect(authService.refreshTokens('refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshTokensRepository.create).not.toHaveBeenCalled();
    });
  });
});
