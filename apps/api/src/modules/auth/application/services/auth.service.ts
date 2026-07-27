import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPasswordHasher, PASSWORD_HASHER } from '@shared/security/password-hasher.interface';
import { UsersService } from '@modules/users/application/services/users.service';
import { UserStatus } from '@modules/users/domain/entities/user.entity';
import {
  IOrganizationMembersRepository,
  ORGANIZATION_MEMBERS_REPOSITORY,
} from '@modules/organizations/domain/repositories/organization-member-repository.interface';
import { RolesService } from '@modules/roles/application/services/roles.service';
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
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(ORGANIZATION_MEMBERS_REPOSITORY)
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
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

    await this.requestEmailVerification(safeUser.id, safeUser.email);

    return this.issueTokensForUser(safeUser.id);
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

    return {
      id: user.id,
      email: user.email,
      organizationId: memberships[0]?.organizationId ?? null,
      workspaceId: null,
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
