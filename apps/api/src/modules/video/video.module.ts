import { Module } from '@nestjs/common';
import { VeoProvider } from './infrastructure/providers/veo.provider';
import { RunwayProvider } from './infrastructure/providers/runway.provider';
import { KlingProvider } from './infrastructure/providers/kling.provider';
import { PikaProvider } from './infrastructure/providers/pika.provider';
import { VideoProviderFactory } from './infrastructure/video-provider.factory';
import { VideoService } from './application/services/video.service';
import { VideoController } from './presentation/video.controller';

@Module({
  controllers: [VideoController],
  providers: [
    VeoProvider,
    RunwayProvider,
    KlingProvider,
    PikaProvider,
    VideoProviderFactory,
    VideoService,
  ],
  exports: [VideoService],
})
export class VideoModule {}
