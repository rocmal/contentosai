import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Profile, Strategy } from 'passport-google-oauth20';
import { OAuthProvider } from '../../domain/entities/oauth-account.entity';
import { OAuthProfile, OAuthService } from '../../application/services/oauth.service';

/**
 * Registered unconditionally so the app always boots; until GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET are set in the environment the placeholder credentials
 * below simply cause Google to reject the OAuth handshake rather than the
 * process crashing at startup.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.google.clientId') || 'not-configured',
      clientSecret: configService.get<string>('oauth.google.clientSecret') || 'not-configured',
      callbackURL: `${configService.get<string>('app.url')}/api/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: unknown) => void,
  ): Promise<void> {
    const oauthProfile: OAuthProfile = {
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      firstName: profile.name?.givenName ?? profile.displayName ?? 'Unknown',
      lastName: profile.name?.familyName ?? '',
      avatarUrl: profile.photos?.[0]?.value,
    };

    const tokens = await this.oauthService.validateOAuthLogin(OAuthProvider.GOOGLE, oauthProfile);
    done(null, tokens);
  }
}
