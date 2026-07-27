import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuthenticatedUser, JwtPayload } from '@common/interfaces/jwt-payload.interface';

const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(user: AuthenticatedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      roles: user.roles,
      permissions: user.permissions,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
  }

  signRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      },
    );
  }

  verifyRefreshToken(token: string): { sub: string } {
    return this.jwtService.verify<{ sub: string }>(token, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
    });
  }

  /** Opaque, single-use tokens (email verification / password reset). Only the
   * SHA-256 hash is persisted - the raw value is emailed to the user and never
   * stored, so a database leak alone cannot be used to take over an account. */
  generateOpaqueToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex');
    return { token, hash: this.hashToken(token) };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiryDate(): Date {
    const duration = this.configService.get<string>('jwt.refreshExpiresIn') ?? '30d';
    return this.addDuration(new Date(), duration);
  }

  getOpaqueTokenExpiryDate(duration = '1h'): Date {
    return this.addDuration(new Date(), duration);
  }

  private addDuration(base: Date, duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(base.getTime() + DURATION_MULTIPLIERS.d * 30);
    }
    const [, value, unit] = match;
    return new Date(base.getTime() + parseInt(value, 10) * DURATION_MULTIPLIERS[unit]);
  }
}
