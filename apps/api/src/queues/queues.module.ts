import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule } from '@modules/ai/ai.module';
import { VideoModule } from '@modules/video/video.module';
import { QueueName } from './queue-names';
import { AiProcessor } from './processors/ai.processor';
import { VideoProcessor } from './processors/video.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { EmailProcessor } from './processors/email.processor';
import { EmailEventsListener } from './listeners/email-events.listener';

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
    ),
    AiModule,
    VideoModule,
  ],
  providers: [AiProcessor, VideoProcessor, AnalyticsProcessor, EmailProcessor, EmailEventsListener],
  exports: [BullModule],
})
export class QueuesModule {}
