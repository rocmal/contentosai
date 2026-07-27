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

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  readonly name = 's3';
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: this.configService.get<string>('storage.s3.region'),
        credentials: {
          accessKeyId: this.configService.get<string>('storage.s3.accessKeyId') ?? '',
          secretAccessKey: this.configService.get<string>('storage.s3.secretAccessKey') ?? '',
        },
      });
    }
    return this.client;
  }

  private get bucket(): string {
    const bucket = this.configService.get<string>('storage.s3.bucket');
    if (!bucket) {
      throw new ServiceUnavailableException('S3 storage is not configured (AWS_BUCKET missing)');
    }
    return bucket;
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
