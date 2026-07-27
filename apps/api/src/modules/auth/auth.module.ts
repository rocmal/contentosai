import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '@modules/users/users.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { RolesModule } from '@modules/roles/roles.module';
import { RefreshTokenModel } from './infrastructure/persistence/refresh-token.model';
import { EmailVerificationTokenModel } from './infrastructure/persistence/email-verification-token.model';
import { PasswordResetTokenModel } from './infrastructure/persistence/password-reset-token.model';
import { OAuthAccountModel } from './infrastructure/persistence/oauth-account.model';
import { RefreshTokensRepository } from './infrastructure/persistence/refresh-tokens.repository';
import { EmailVerificationTokensRepository } from './infrastructure/persistence/email-verification-tokens.repository';
import { PasswordResetTokensRepository } from './infrastructure/persistence/password-reset-tokens.repository';
import { OAuthAccountsRepository } from './infrastructure/persistence/oauth-accounts.repository';
import { REFRESH_TOKENS_REPOSITORY } from './domain/repositories/refresh-token-repository.interface';
import { EMAIL_VERIFICATION_TOKENS_REPOSITORY } from './domain/repositories/email-verification-token-repository.interface';
import { PASSWORD_RESET_TOKENS_REPOSITORY } from './domain/repositories/password-reset-token-repository.interface';
import { OAUTH_ACCOUNTS_REPOSITORY } from './domain/repositories/oauth-account-repository.interface';
import { AuthService } from './application/services/auth.service';
import { OAuthService } from './application/services/oauth.service';
import { TokenService } from './application/services/token.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { GithubStrategy } from './infrastructure/strategies/github.strategy';
import { MicrosoftStrategy } from './infrastructure/strategies/microsoft.strategy';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      RefreshTokenModel,
      EmailVerificationTokenModel,
      PasswordResetTokenModel,
      OAuthAccountModel,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
    }),
    UsersModule,
    OrganizationsModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    TokenService,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    MicrosoftStrategy,
    { provide: REFRESH_TOKENS_REPOSITORY, useClass: RefreshTokensRepository },
    { provide: EMAIL_VERIFICATION_TOKENS_REPOSITORY, useClass: EmailVerificationTokensRepository },
    { provide: PASSWORD_RESET_TOKENS_REPOSITORY, useClass: PasswordResetTokensRepository },
    { provide: OAUTH_ACCOUNTS_REPOSITORY, useClass: OAuthAccountsRepository },
  ],
  exports: [AuthService],
})
export class AuthModule {}
