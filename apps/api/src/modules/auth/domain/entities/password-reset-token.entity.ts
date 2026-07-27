import { BaseEntity } from '@shared/domain/base.entity';

export interface PasswordResetToken extends BaseEntity {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}
