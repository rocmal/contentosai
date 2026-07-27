import { Module } from '@nestjs/common';
import { LocalStorageProvider } from './infrastructure/providers/local-storage.provider';
import { S3StorageProvider } from './infrastructure/providers/s3-storage.provider';
import { MinioStorageProvider } from './infrastructure/providers/minio-storage.provider';
import { StorageProviderFactory } from './infrastructure/storage-provider.factory';
import { StorageService } from './application/services/storage.service';
import { StorageController } from './presentation/storage.controller';

@Module({
  controllers: [StorageController],
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    MinioStorageProvider,
    StorageProviderFactory,
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
