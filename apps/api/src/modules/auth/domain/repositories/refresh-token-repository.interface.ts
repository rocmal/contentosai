import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { RefreshToken } from '../entities/refresh-token.entity';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export const REFRESH_TOKENS_REPOSITORY = Symbol('REFRESH_TOKENS_REPOSITORY');

export interface IRefreshTokensRepository extends IBaseRepository<
  RefreshToken,
  CreateRefreshTokenData,
  Partial<CreateRefreshTokenData>
> {
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
