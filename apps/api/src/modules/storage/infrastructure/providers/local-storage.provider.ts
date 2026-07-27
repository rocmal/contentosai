import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  IStorageProvider,
  StoredFile,
  UploadFileInput,
} from '../../domain/interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';

  constructor(private readonly configService: ConfigService) {}

  private get rootPath(): string {
    return this.configService.get<string>('storage.local.path') ?? 'storage';
  }

  private resolvePath(key: string): string {
    return join(process.cwd(), this.rootPath, 'uploads', key);
  }

  async upload({ key, buffer }: UploadFileInput): Promise<StoredFile> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return { key, url: await this.getUrl(key) };
  }

  async getUrl(key: string): Promise<string> {
    const appUrl = this.configService.get<string>('app.url') ?? 'http://localhost:3000';
    return `${appUrl}/storage/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolvePath(key), { force: true });
  }

  /** Exposed for tests/tools that need raw bytes rather than a served URL. */
  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }
}
