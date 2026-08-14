import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { configurations, envValidationSchema } from '@config/index';
import { DatabaseModule } from '@database/database.module';
import { DomainEventsModule } from '@events/event-emitter.module';
import { SharedModule } from '@shared/shared.module';
import { SecurityModule } from '@shared/security/security.module';
import { MailerModule } from '@shared/mail/mailer.module';
import { buildPinoHttpOptions } from '@common/logger/pino-logger.config';
import { CorrelationIdMiddleware } from '@common/middleware/correlation-id.middleware';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';

import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { RolesModule } from '@modules/roles/roles.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { ContentModule } from '@modules/content/content.module';
import { AiModule } from '@modules/ai/ai.module';
import { ImageModule } from '@modules/image/image.module';
import { VideoModule } from '@modules/video/video.module';
import { CharacterModule } from '@modules/character/character.module';
import { AvatarsModule } from '@modules/avatars/avatars.module';
import { VoiceModule } from '@modules/voice/voice.module';
import { StorageModule } from '@modules/storage/storage.module';
import { BrandModule } from '@modules/brand/brand.module';
import { MediaModule } from '@modules/media/media.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { AutomationModule } from '@modules/automation/automation.module';
import { PublishingModule } from '@modules/publishing/publishing.module';
import { CalendarModule } from '@modules/calendar/calendar.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { BillingModule } from '@modules/billing/billing.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { CurrencyModule } from '@modules/currency/currency.module';
import { ContactModule } from '@modules/contact/contact.module';
import { IntegrationsModule } from '@modules/integrations/integrations.module';
import { VideoTemplatesModule } from '@modules/video-templates/video-templates.module';
import { VoiceTemplatesModule } from '@modules/voice-templates/voice-templates.module';
import { AuditModule } from '@modules/audit/audit.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { HealthModule } from '@modules/health/health.module';
import { QueuesModule } from '@queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env.APP_ENV ?? 'development'}`, '.env'],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
      load: configurations,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildPinoHttpOptions,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    DomainEventsModule,

    // Cross-cutting infrastructure
    SharedModule,
    SecurityModule,
    MailerModule,
    DatabaseModule,
    QueuesModule,

    // Multi-tenancy / RBAC core
    PermissionsModule,
    RolesModule,
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    AuthModule,

    // AI / generative provider modules
    AiModule,
    ImageModule,
    VideoModule,
    CharacterModule,
    AvatarsModule,
    VoiceModule,
    StorageModule,

    // Product feature modules
    BrandModule,
    CampaignsModule,
    ContentModule,
    MediaModule,
    AnalyticsModule,
    AutomationModule,
    PublishingModule,
    CalendarModule,
    NotificationsModule,
    BillingModule,
    CreditsModule,
    CurrencyModule,
    ContactModule,
    IntegrationsModule,
    VideoTemplatesModule,
    VoiceTemplatesModule,
    AuditModule,
    SettingsModule,

    HealthModule,
  ],
  providers: [
    // Order matters: Throttler runs first, then JWT authentication populates
    // request.user, then Roles/Permissions guards can read it.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
