import { BaseEntity } from '@shared/domain/base.entity';

export interface EmailVerificationToken extends BaseEntity {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}
