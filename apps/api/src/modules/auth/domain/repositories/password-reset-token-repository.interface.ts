import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

export interface CreatePasswordResetTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export const PASSWORD_RESET_TOKENS_REPOSITORY = Symbol('PASSWORD_RESET_TOKENS_REPOSITORY');

export interface IPasswordResetTokensRepository extends IBaseRepository<
  PasswordResetToken,
  CreatePasswordResetTokenData,
  Partial<CreatePasswordResetTokenData>
> {
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  consume(id: string): Promise<void>;
}
