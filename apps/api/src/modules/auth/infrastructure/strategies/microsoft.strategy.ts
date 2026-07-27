import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-microsoft';
import { OAuthProvider } from '../../domain/entities/oauth-account.entity';
import { OAuthProfile, OAuthService } from '../../application/services/oauth.service';

interface MicrosoftProfile {
  id: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value: string }[];
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.microsoft.clientId') || 'not-configured',
      clientSecret: configService.get<string>('oauth.microsoft.clientSecret') || 'not-configured',
      callbackURL: `${configService.get<string>('app.url')}/api/v1/auth/microsoft/callback`,
      scope: ['user.read'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: MicrosoftProfile,
    done: (error: unknown, user?: unknown) => void,
  ): Promise<void> {
    const oauthProfile: OAuthProfile = {
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      firstName: profile.name?.givenName ?? profile.displayName ?? 'Unknown',
      lastName: profile.name?.familyName ?? '',
    };

    const tokens = await this.oauthService.validateOAuthLogin(
      OAuthProvider.MICROSOFT,
      oauthProfile,
    );
    done(null, tokens);
  }
}
