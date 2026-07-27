import { BaseEntity } from '@shared/domain/base.entity';

export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
}

export interface OAuthAccount extends BaseEntity {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
}
