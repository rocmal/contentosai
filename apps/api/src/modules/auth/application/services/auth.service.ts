import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
import { ROLES_REPOSITORY, IRolesRepository } from '@modules/roles/domain/repositories/role-repository.interface';
import { RolesService } from '@modules/roles/application/services/roles.service';
import {
  ISubscriptionsRepository,
  SUBSCRIPTIONS_REPOSITORY,
} from '@modules/billing/domain/repositories/subscription-repository.interface';
import { SubscriptionStatus } from '@modules/billing/domain/entities/subscription.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { DEFAULT_PLAN } from '@modules/credits/credits.constants';
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
  ) {}

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
  ): Promise<void> {
    const superAdminRole = await this.rolesRepository.findBySlug(null, 'super-admin');
    if (!superAdminRole) {
      throw new Error(
        'System role "super-admin" is missing - run the permissions/roles seeder before allowing signups.',
      );
    }

    const organization = await this.createOrganizationWithUniqueSlug(firstName, email, userId);

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
      await this.creditsService.grantInitial(organization.id, workspace.id, DEFAULT_PLAN, userId);
    } catch (err) {
      // The org/workspace/subscription are real and usable even if this one
      // step fails - don't fail the whole signup over it, but don't hide it either.
      this.logger.error(
        `Failed to grant initial credits for new workspace ${workspace.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async createOrganizationWithUniqueSlug(firstName: string, email: string, ownerId: string) {
    const base = slugify(firstName) || slugify(email.split('@')[0]) || 'workspace';
    const displayName = firstName ? `${firstName}'s Workspace` : 'My Workspace';

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

    await this.usersService.recordLogin(user.id);
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

  async buildAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.usersService.findEntityById(userId);
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
