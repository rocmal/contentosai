import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPasswordHasher, PASSWORD_HASHER } from '@shared/security/password-hasher.interface';
import { UsersService } from '@modules/users/application/services/users.service';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import {
  IOrganizationMembersRepository,
  ORGANIZATION_MEMBERS_REPOSITORY,
} from '@modules/organizations/domain/repositories/organization-member-repository.interface';
import {
  IOrganizationsRepository,
  ORGANIZATIONS_REPOSITORY,
} from '@modules/organizations/domain/repositories/organization-repository.interface';
import {
  IWorkspacesRepository,
  WORKSPACES_REPOSITORY,
} from '@modules/workspaces/domain/repositories/workspace-repository.interface';
import {
  ROLES_REPOSITORY,
  IRolesRepository,
} from '@modules/roles/domain/repositories/role-repository.interface';
import { RolesService } from '@modules/roles/application/services/roles.service';
import {
  ISubscriptionsRepository,
  SUBSCRIPTIONS_REPOSITORY,
} from '@modules/billing/domain/repositories/subscription-repository.interface';
import { SubscriptionStatus } from '@modules/billing/domain/entities/subscription.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { DEFAULT_PLAN, TRIAL_CREDITS } from '@modules/credits/credits.constants';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { TokenService } from './token.service';
import {
  IRefreshTokensRepository,
  REFRESH_TOKENS_REPOSITORY,
} from '../../domain/repositories/refresh-token-repository.interface';
import {
  EMAIL_VERIFICATION_TOKENS_REPOSITORY,
  IEmailVerificationTokensRepository,
} from '../../domain/repositories/email-verification-token-repository.interface';
import {
  IPasswordResetTokensRepository,
  PASSWORD_RESET_TOKENS_REPOSITORY,
} from '../../domain/repositories/password-reset-token-repository.interface';
import { EmailVerificationRequestedEvent } from '../events/email-verification-requested.event';
import { PasswordResetRequestedEvent } from '../events/password-reset-requested.event';
import { AccountCreatedForCustomerEvent } from '../events/account-created-for-customer.event';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
    private readonly creditsService: CreditsService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(ORGANIZATION_MEMBERS_REPOSITORY)
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: IOrganizationsRepository,
    @Inject(WORKSPACES_REPOSITORY)
    private readonly workspacesRepository: IWorkspacesRepository,
    @Inject(ROLES_REPOSITORY)
    private readonly rolesRepository: IRolesRepository,
    @Inject(SUBSCRIPTIONS_REPOSITORY)
    private readonly subscriptionsRepository: ISubscriptionsRepository,
    @Inject(REFRESH_TOKENS_REPOSITORY)
    private readonly refreshTokensRepository: IRefreshTokensRepository,
    @Inject(EMAIL_VERIFICATION_TOKENS_REPOSITORY)
    private readonly emailVerificationTokensRepository: IEmailVerificationTokensRepository,
    @Inject(PASSWORD_RESET_TOKENS_REPOSITORY)
    private readonly passwordResetTokensRepository: IPasswordResetTokensRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  /** Lumora staff, named by PLATFORM_ADMIN_EMAILS (platform.config.ts). */
  isPlatformAdmin(email: string): boolean {
    const admins = this.configService?.get<string[]>('platform.adminEmails') ?? [];
    return admins.includes(email.trim().toLowerCase());
  }

  /**
   * Run when the API starts (PlatformAdminAccountsBootstrap): every PLATFORM_ADMIN_EMAILS address that has no account
   * yet gets one, signed in with PLATFORM_ADMIN_INITIAL_PASSWORD and marked verified (the address came from our own
   * secret). Accounts that exist are never changed, so a password changed in Profile stays. Never throws for one
   * address; logs counts only, never addresses or the password.
   */
  async ensurePlatformAdminAccounts(): Promise<{ created: number; unverified: number }> {
    const emails = this.configService?.get<string[]>('platform.adminEmails') ?? [];
    const password = this.configService?.get<string>('platform.initialPassword') ?? '';
    const result = { created: 0, unverified: 0 };
    if (emails.length === 0 || !password) return result;
    if (password.length < 8) {
      this.logger.warn(
        'PLATFORM_ADMIN_INITIAL_PASSWORD is shorter than 8 characters: no admin account was created.',
      );
      return result;
    }

    for (const email of emails) {
      try {
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
          if (!existing.isEmailVerified) result.unverified += 1;
          continue;
        }
        const user = await this.usersService.create({
          email,
          firstName: 'Lumora',
          lastName: 'Admin',
          password,
        });
        await this.provisionPersonalWorkspace(user.id, user.email, 'Lumora', 'Lumora Admin');
        await this.usersService.markEmailVerified(user.id);
        result.created += 1;
      } catch (err) {
        this.logger.error(
          `Could not create a platform admin account: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (result.created > 0) {
      this.logger.log(`Created ${result.created} platform admin account(s)`);
    }
    if (result.unverified > 0) {
      this.logger.warn(
        `${result.unverified} platform admin email(s) belong to an account whose email is not verified: ` +
          'not an admin until it is verified.',
      );
    }
    return result;
  }

  async register(dto: RegisterDto): Promise<IssuedTokens> {
    const safeUser = await this.usersService.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
    });

    await this.provisionPersonalWorkspace(safeUser.id, safeUser.email, dto.firstName);
    await this.requestEmailVerification(safeUser.id, safeUser.email);

    return this.issueTokensForUser(safeUser.id);
  }

  /**
   * A platform admin opening an account for a customer (Admin page): the same organization, workspace, trial and
   * credits as a sign-up. Either the admin sets the password (the account works at once; the email, if sent, never
   * contains it), or there is none yet and the person chooses one with the returned link, which is also emailed when
   * asked and stays valid for 7 days; until then the account is "invited" and cannot sign in.
   */
  async createAccountForCustomer(
    input: {
      email: string;
      firstName: string;
      lastName: string;
      organizationName?: string;
      /** Set by the admin; omitted = the person chooses one with the link. */
      password?: string;
      sendEmail: boolean;
    },
    actorId: string,
  ): Promise<{ userId: string; organizationId: string; setPasswordLink: string | null }> {
    const user = await this.usersService.create(
      {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        password: input.password,
      },
      actorId,
    );
    const organizationId = await this.provisionPersonalWorkspace(
      user.id,
      user.email,
      input.firstName,
      input.organizationName,
    );

    let token: string | null = null;
    if (!input.password) {
      const opaque = this.tokenService.generateOpaqueToken();
      token = opaque.token;
      await this.passwordResetTokensRepository.create({
        userId: user.id,
        tokenHash: opaque.hash,
        expiresAt: this.tokenService.getOpaqueTokenExpiryDate('7d'),
      });
    }
    if (input.sendEmail) {
      this.eventEmitter.emit(
        'auth.account-created-for-customer',
        new AccountCreatedForCustomerEvent(user.id, user.email, input.firstName, token),
      );
    }

    const appUrl = this.configService?.get<string>('app.url') ?? '';
    return {
      userId: user.id,
      organizationId,
      setPasswordLink: token ? `${appUrl}/reset-password?token=${token}&welcome=1` : null,
    };
  }

  /** New signups previously got no organization/workspace at all - every
   * "create X" action in the app (campaigns, brand profile, credits, ...)
   * requires one, so a self-registered user landed in the dashboard with
   * every such action failing. Mirrors what the demo-data seeder does for
   * the seeded admin/member users: a personal org (the new user as owner,
   * "super-admin" role - full permissions over their own org, same as the
   * seeded admin), a "Default" workspace, and a starter-plan trial
   * subscription + its matching initial credit grant. */
  private async provisionPersonalWorkspace(
    userId: string,
    email: string,
    firstName: string,
    /** Instead of "<first name>'s Workspace" (an account a platform admin opens for a business). */
    organizationName?: string,
  ): Promise<string> {
    const superAdminRole = await this.rolesRepository.findBySlug(null, 'super-admin');
    if (!superAdminRole) {
      throw new Error(
        'System role "super-admin" is missing - run the permissions/roles seeder before allowing signups.',
      );
    }

    const organization = await this.createOrganizationWithUniqueSlug(
      firstName,
      email,
      userId,
      organizationName,
    );

    const workspace = await this.workspacesRepository.create(
      { organizationId: organization.id, name: 'Default', slug: 'default', description: null },
      userId,
    );

    await this.organizationMembersRepository.create(
      { organizationId: organization.id, userId, roleId: superAdminRole.id },
      userId,
    );

    await this.subscriptionsRepository.create(
      { organizationId: organization.id, plan: DEFAULT_PLAN, status: SubscriptionStatus.TRIALING },
      userId,
    );

    try {
      await this.creditsService.grantInitial(
        organization.id,
        workspace.id,
        DEFAULT_PLAN,
        userId,
        TRIAL_CREDITS,
      );
    } catch (err) {
      // The org/workspace/subscription are real and usable even if this one
      // step fails - don't fail the whole signup over it, but don't hide it either.
      this.logger.error(
        `Failed to grant initial credits for new workspace ${workspace.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
    return organization.id;
  }

  private async createOrganizationWithUniqueSlug(
    firstName: string,
    email: string,
    ownerId: string,
    organizationName?: string,
  ) {
    // Kept short: the slug column holds 150 characters and a random suffix is added.
    const base = (
      slugify(organizationName ?? '') ||
      slugify(firstName) ||
      slugify(email.split('@')[0]) ||
      'workspace'
    ).slice(0, 60);
    const displayName =
      organizationName?.trim() || (firstName ? `${firstName}'s Workspace` : 'My Workspace');

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base}-${randomSlugSuffix()}`;
      const existing = await this.organizationsRepository.findBySlug(slug);
      if (!existing) {
        return this.organizationsRepository.create({ name: displayName, slug, ownerId }, ownerId);
      }
    }
    throw new Error('Failed to allocate a unique organization slug after 5 attempts');
  }

  async login(dto: LoginDto): Promise<IssuedTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended');
    }

    const passwordMatches = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only a "last signed in" time: two sign-ins at the same instant clash on the row's version, which must not
    // fail the sign-in itself.
    try {
      await this.usersService.recordLogin(user.id);
    } catch (error) {
      this.logger.warn(
        `Could not record the sign-in time: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return this.issueTokensForUser(user.id);
  }

  async refreshTokens(refreshToken: string): Promise<IssuedTokens> {
    let decoded: { sub: string };
    try {
      decoded = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.tokenService.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findByTokenHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }

    await this.refreshTokensRepository.revoke(stored.id);
    return this.issueTokensForUser(decoded.sub);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findByTokenHash(tokenHash);
    if (stored) {
      await this.refreshTokensRepository.revoke(stored.id);
    }
  }

  async requestEmailVerification(userId: string, email: string): Promise<void> {
    const { token, hash } = this.tokenService.generateOpaqueToken();
    await this.emailVerificationTokensRepository.create({
      userId,
      tokenHash: hash,
      expiresAt: this.tokenService.getOpaqueTokenExpiryDate('24h'),
    });
    this.eventEmitter.emit(
      'auth.email-verification-requested',
      new EmailVerificationRequestedEvent(userId, email, token),
    );
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const record = await this.emailVerificationTokensRepository.findByTokenHash(tokenHash);
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.emailVerificationTokensRepository.consume(record.id);
    await this.usersService.markEmailVerified(record.userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Do not reveal whether the email exists.
      return;
    }
    const { token, hash } = this.tokenService.generateOpaqueToken();
    await this.passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt: this.tokenService.getOpaqueTokenExpiryDate('1h'),
    });
    this.eventEmitter.emit(
      'auth.password-reset-requested',
      new PasswordResetRequestedEvent(user.id, user.email, token),
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const record = await this.passwordResetTokensRepository.findByTokenHash(tokenHash);
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    await this.passwordResetTokensRepository.consume(record.id);
    await this.usersService.setPassword(record.userId, newPassword);
    await this.refreshTokensRepository.revokeAllForUser(record.userId);
  }

  /**
   * Changes the password of the signed-in account (the current one is asked again). Every other session is signed
   * out - a leaked password stops working everywhere at once - and this one gets fresh tokens.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findEntityById(userId);
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account signs in with Google or GitHub and has no password yet. Use "Email me a reset link" to set one.',
      );
    }
    if (!(await this.passwordHasher.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('Pick a new password that is different from the current one.');
    }
    await this.usersService.setPassword(userId, newPassword);
    await this.refreshTokensRepository.revokeAllForUser(userId);
    return this.issueTokensForUser(userId);
  }

  /**
   * Self-service account deletion (required by the App Store when an app offers sign-up).
   * The password is asked again so a borrowed, unlocked phone cannot delete the account.
   * An owner whose organization still has other members must hand it over first, otherwise
   * the team would be left without anyone able to manage it.
   */
  async deleteAccount(userId: string, password: string | undefined): Promise<void> {
    const user = await this.usersService.findEntityById(userId);
    if (user.passwordHash) {
      const passwordMatches = password
        ? await this.passwordHasher.compare(password, user.passwordHash)
        : false;
      if (!passwordMatches) {
        throw new UnauthorizedException('Password is incorrect');
      }
    }

    const memberships = await this.organizationMembersRepository.listByUser(userId);
    for (const membership of memberships) {
      const organization = await this.organizationsRepository.findById(membership.organizationId);
      if (organization?.ownerId !== userId) continue;
      const members = await this.organizationMembersRepository.listByOrganization(
        membership.organizationId,
      );
      if (members.some((m) => m.userId !== userId)) {
        throw new BadRequestException(
          `You own "${organization.name}", which still has other members. Remove them or ask support to transfer ownership first.`,
        );
      }
    }

    for (const membership of memberships) {
      await this.organizationMembersRepository.delete(membership.id, userId);
    }
    await this.refreshTokensRepository.revokeAllForUser(userId);
    await this.usersService.anonymizeAndRemove(userId);
  }

  /** Ends every session of this person (used when a platform admin suspends the account). */
  async signOutEverywhere(userId: string): Promise<void> {
    await this.refreshTokensRepository.revokeAllForUser(userId);
  }

  /** Runs on every request (JwtStrategy), every token renewal and every sign-in, so a suspension takes effect at once
   * - the password check in login() alone let a signed-in person carry on until they signed out. */
  async buildAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.usersService.findEntityById(userId);
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended');
    }
    const memberships = await this.organizationMembersRepository.listByUser(userId);

    const roleSlugs = new Set<string>();
    const permissionSlugs = new Set<string>();

    for (const membership of memberships) {
      const role = await this.rolesService.findById(membership.roleId);
      roleSlugs.add(role.slug);
      role.permissionSlugs?.forEach((slug) => permissionSlugs.add(slug));
    }

    const organizationId = memberships[0]?.organizationId ?? null;
    // No workspace-membership model exists yet - a user's organization
    // membership implies access to all of that organization's workspaces, so
    // the first one is used as the "current" workspace for tenant scoping.
    const workspaces = organizationId
      ? await this.workspacesRepository.listByOrganization(organizationId)
      : [];

    return {
      id: user.id,
      email: user.email,
      organizationId,
      workspaceId: workspaces[0]?.id ?? null,
      roles: Array.from(roleSlugs),
      permissions: Array.from(permissionSlugs),
      // A verified email too: sign-up does not check the address, so whoever signed up with an admin email first
      // (before it was named) would otherwise become an admin the moment it is.
      isPlatformAdmin: user.isEmailVerified && this.isPlatformAdmin(user.email),
    };
  }

  async issueTokensForUser(userId: string): Promise<IssuedTokens> {
    const authenticatedUser = await this.buildAuthenticatedUser(userId);
    const accessToken = this.tokenService.signAccessToken(authenticatedUser);
    const refreshToken = this.tokenService.signRefreshToken(userId);

    await this.refreshTokensRepository.create({
      userId,
      tokenHash: this.tokenService.hashToken(refreshToken),
      expiresAt: this.tokenService.getRefreshTokenExpiryDate(),
    });

    return { accessToken, refreshToken, user: authenticatedUser };
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
