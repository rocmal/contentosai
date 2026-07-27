import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { OAuthAccount, OAuthProvider } from '../entities/oauth-account.entity';

export interface CreateOAuthAccountData {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
}

export const OAUTH_ACCOUNTS_REPOSITORY = Symbol('OAUTH_ACCOUNTS_REPOSITORY');

export interface IOAuthAccountsRepository extends IBaseRepository<
  OAuthAccount,
  CreateOAuthAccountData,
  Partial<CreateOAuthAccountData>
> {
  findByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<OAuthAccount | null>;
}
