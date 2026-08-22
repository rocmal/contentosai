import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule } from '@modules/ai/ai.module';
import { VideoModule } from '@modules/video/video.module';
import { ContentModule } from '@modules/content/content.module';
import { IntegrationsModule } from '@modules/integrations/integrations.module';
import { PublishingModule } from '@modules/publishing/publishing.module';
import { BillingModule } from '@modules/billing/billing.module';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { QueueName } from './queue-names';
import { AiProcessor } from './processors/ai.processor';
import { VideoProcessor } from './processors/video.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { EmailProcessor } from './processors/email.processor';
import { SocialPublishProcessor } from './processors/social-publish.processor';
import { CreditsRenewalProcessor } from './processors/credits-renewal.processor';
import { CreditsRenewalScheduler } from './credits-renewal.scheduler';
import { EmailEventsListener } from './listeners/email-events.listener';
import { SocialPublishEventsListener } from './listeners/social-publish-events.listener';
import { VideoEventsListener } from './listeners/video-events.listener';

/**
 * Wires BullMQ to Redis and registers every named queue plus its worker.
 * Feature modules that need to enqueue work import this module and inject
 * the relevant queue with @InjectQueue(QueueName.X) - they never talk to
 * Redis directly.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QueueName.AI },
      { name: QueueName.VIDEO },
      { name: QueueName.ANALYTICS },
      { name: QueueName.EMAIL },
      { name: QueueName.SOCIAL_PUBLISH },
      { name: QueueName.CREDITS_RENEWAL },
    ),
    AiModule,
    VideoModule,
    ContentModule,
    IntegrationsModule,
    PublishingModule,
    BillingModule,
    WorkspacesModule,
    CreditsModule,
  ],
  providers: [
    AiProcessor,
    VideoProcessor,
    AnalyticsProcessor,
    EmailProcessor,
    SocialPublishProcessor,
    CreditsRenewalProcessor,
    CreditsRenewalScheduler,
    EmailEventsListener,
    SocialPublishEventsListener,
    VideoEventsListener,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
