import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider } from '../domain/interfaces/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { MinioStorageProvider } from './providers/minio-storage.provider';

@Injectable()
export class StorageProviderFactory {
  private readonly providers: Map<string, IStorageProvider>;

  constructor(
    private readonly configService: ConfigService,
    localStorageProvider: LocalStorageProvider,
    s3StorageProvider: S3StorageProvider,
    minioStorageProvider: MinioStorageProvider,
  ) {
    this.providers = new Map<string, IStorageProvider>([
      [localStorageProvider.name, localStorageProvider],
      [s3StorageProvider.name, s3StorageProvider],
      [minioStorageProvider.name, minioStorageProvider],
    ]);
  }

  getProvider(): IStorageProvider {
    const providerName = this.configService.get<string>('storage.provider') ?? 'local';
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown storage provider "${providerName}" configured in STORAGE_PROVIDER`);
    }
    return provider;
  }
}
