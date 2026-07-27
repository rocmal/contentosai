import { Inject, Injectable } from '@nestjs/common';
import { UsersService } from '@modules/users/application/services/users.service';
import {
  IOAuthAccountsRepository,
  OAUTH_ACCOUNTS_REPOSITORY,
} from '../../domain/repositories/oauth-account-repository.interface';
import { OAuthProvider } from '../../domain/entities/oauth-account.entity';
import { AuthService } from './auth.service';

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    @Inject(OAUTH_ACCOUNTS_REPOSITORY)
    private readonly oauthAccountsRepository: IOAuthAccountsRepository,
  ) {}

  async validateOAuthLogin(provider: OAuthProvider, profile: OAuthProfile) {
    const existingLink = await this.oauthAccountsRepository.findByProviderAccount(
      provider,
      profile.providerAccountId,
    );

    let userId: string;

    if (existingLink) {
      userId = existingLink.userId;
    } else {
      const existingUser = await this.usersService.findByEmail(profile.email);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const created = await this.usersService.create({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
        });
        userId = created.id;
        await this.usersService.markEmailVerified(userId);
      }

      await this.oauthAccountsRepository.create({
        userId,
        provider,
        providerAccountId: profile.providerAccountId,
      });
    }

    await this.usersService.recordLogin(userId);
    return this.authService.issueTokensForUser(userId);
  }
}
