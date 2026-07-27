import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IStorageProvider,
  StoredFile,
  UploadFileInput,
} from '../../domain/interfaces/storage-provider.interface';

const SIGNED_URL_TTL_SECONDS = 3600;

/** MinIO is S3-API-compatible, so the same AWS SDK v3 client is reused here
 * pointed at the MinIO endpoint with path-style addressing instead of a
 * second, MinIO-specific SDK dependency. */
@Injectable()
export class MinioStorageProvider implements IStorageProvider {
  readonly name = 'minio';
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): S3Client {
    if (!this.client) {
      const endpoint = this.configService.get<string>('storage.minio.endpoint');
      const port = this.configService.get<number>('storage.minio.port');
      if (!endpoint) {
        throw new ServiceUnavailableException(
          'MinIO storage is not configured (MINIO_ENDPOINT missing)',
        );
      }
      this.client = new S3Client({
        endpoint: port ? `${endpoint}:${port}` : endpoint,
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.configService.get<string>('storage.minio.accessKey') ?? '',
          secretAccessKey: this.configService.get<string>('storage.minio.secretKey') ?? '',
        },
      });
    }
    return this.client;
  }

  private get bucket(): string {
    return this.configService.get<string>('storage.minio.bucket') ?? 'lumora';
  }

  async upload({ key, buffer, contentType }: UploadFileInput): Promise<StoredFile> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return { key, url: await this.getUrl(key) };
  }

  async getUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.getClient(), command, { expiresIn: SIGNED_URL_TTL_SECONDS });
  }

  async delete(key: string): Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
