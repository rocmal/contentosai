import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { StorageProviderFactory } from '../../infrastructure/storage-provider.factory';
import { StoredFile } from '../../domain/interfaces/storage-provider.interface';

export interface UploadableFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class StorageService {
  constructor(private readonly providerFactory: StorageProviderFactory) {}

  async uploadFile(file: UploadableFile, keyPrefix = 'general'): Promise<StoredFile> {
    const key = `${keyPrefix}/${randomUUID()}${extname(file.originalname)}`;
    return this.providerFactory.getProvider().upload({
      key,
      buffer: file.buffer,
      contentType: file.mimetype,
    });
  }

  async getUrl(key: string): Promise<string> {
    return this.providerFactory.getProvider().getUrl(key);
  }

  async readFile(key: string): Promise<Buffer> {
    return this.providerFactory.getProvider().read(key);
  }

  async delete(key: string): Promise<void> {
    await this.providerFactory.getProvider().delete(key);
  }
}
