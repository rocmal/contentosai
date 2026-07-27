import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-github2';
import { OAuthProvider } from '../../domain/entities/oauth-account.entity';
import { OAuthProfile, OAuthService } from '../../application/services/oauth.service';

interface GithubProfile {
  id: string;
  username?: string;
  displayName?: string;
  photos?: { value: string }[];
  emails?: { value: string }[];
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.github.clientId') || 'not-configured',
      clientSecret: configService.get<string>('oauth.github.clientSecret') || 'not-configured',
      callbackURL: `${configService.get<string>('app.url')}/api/v1/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GithubProfile,
    done: (error: unknown, user?: unknown) => void,
  ): Promise<void> {
    const [firstName, ...rest] = (profile.displayName ?? profile.username ?? 'Unknown').split(' ');

    const oauthProfile: OAuthProfile = {
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value ?? `${profile.username}@users.noreply.github.com`,
      firstName,
      lastName: rest.join(' '),
      avatarUrl: profile.photos?.[0]?.value,
    };

    const tokens = await this.oauthService.validateOAuthLogin(OAuthProvider.GITHUB, oauthProfile);
    done(null, tokens);
  }
}
