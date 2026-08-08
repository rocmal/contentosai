import { Module } from '@nestjs/common';
import { StorageModule } from '@modules/storage/storage.module';
import { MediaModule } from '@modules/media/media.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { OpenAIImageProvider } from './infrastructure/providers/openai-image.provider';
import { StabilityProvider } from './infrastructure/providers/stability.provider';
import { FluxProvider } from './infrastructure/providers/flux.provider';
import { ImageProviderFactory } from './infrastructure/image-provider.factory';
import { ImageService } from './application/services/image.service';
import { ImageController } from './presentation/image.controller';

@Module({
  imports: [StorageModule, MediaModule, CreditsModule],
  controllers: [ImageController],
  providers: [
    OpenAIImageProvider,
    StabilityProvider,
    FluxProvider,
    ImageProviderFactory,
    ImageService,
  ],
  exports: [ImageService],
})
export class ImageModule {}
