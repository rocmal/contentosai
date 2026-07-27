import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';

export interface CreateEmailVerificationTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export const EMAIL_VERIFICATION_TOKENS_REPOSITORY = Symbol('EMAIL_VERIFICATION_TOKENS_REPOSITORY');

export interface IEmailVerificationTokensRepository extends IBaseRepository<
  EmailVerificationToken,
  CreateEmailVerificationTokenData,
  Partial<CreateEmailVerificationTokenData>
> {
  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;
  consume(id: string): Promise<void>;
}
