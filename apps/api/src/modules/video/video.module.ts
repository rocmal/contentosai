import { Module } from '@nestjs/common';
import { CreditsModule } from '@modules/credits/credits.module';
import { StorageModule } from '@modules/storage/storage.module';
import { MediaModule } from '@modules/media/media.module';
import { VeoProvider } from './infrastructure/providers/veo.provider';
import { RunwayProvider } from './infrastructure/providers/runway.provider';
import { KlingProvider } from './infrastructure/providers/kling.provider';
import { PikaProvider } from './infrastructure/providers/pika.provider';
import { LumaProvider } from './infrastructure/providers/luma.provider';
import { MockVideoProvider } from './infrastructure/providers/mock-video.provider';
import { VideoProviderFactory } from './infrastructure/video-provider.factory';
import { VideoService } from './application/services/video.service';
import { VideoController } from './presentation/video.controller';

@Module({
  imports: [CreditsModule, StorageModule, MediaModule],
  controllers: [VideoController],
  providers: [
    VeoProvider,
    RunwayProvider,
    KlingProvider,
    PikaProvider,
    LumaProvider,
    MockVideoProvider,
    VideoProviderFactory,
    VideoService,
  ],
  exports: [VideoService],
})
export class VideoModule {}
