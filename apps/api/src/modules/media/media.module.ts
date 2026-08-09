import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StorageModule } from '@modules/storage/storage.module';
import { MediaAssetModel } from './infrastructure/persistence/media-asset.model';
import { MediaAssetsRepository } from './infrastructure/persistence/media-assets.repository';
import { MEDIA_ASSETS_REPOSITORY } from './domain/repositories/media-asset-repository.interface';
import { MediaAssetsService } from './application/services/media-assets.service';
import { MediaAssetsController } from './presentation/media-assets.controller';

@Module({
  imports: [SequelizeModule.forFeature([MediaAssetModel]), StorageModule],
  controllers: [MediaAssetsController],
  providers: [
    MediaAssetsService,
    { provide: MEDIA_ASSETS_REPOSITORY, useClass: MediaAssetsRepository },
  ],
  exports: [MediaAssetsService, MEDIA_ASSETS_REPOSITORY],
})
export class MediaModule {}
