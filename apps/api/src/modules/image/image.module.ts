import { Module } from '@nestjs/common';
import { OpenAIImageProvider } from './infrastructure/providers/openai-image.provider';
import { StabilityProvider } from './infrastructure/providers/stability.provider';
import { FluxProvider } from './infrastructure/providers/flux.provider';
import { ImageProviderFactory } from './infrastructure/image-provider.factory';
import { ImageService } from './application/services/image.service';
import { ImageController } from './presentation/image.controller';

@Module({
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
