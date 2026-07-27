import { BaseEntity } from '@shared/domain/base.entity';

export interface RefreshToken extends BaseEntity {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
}
