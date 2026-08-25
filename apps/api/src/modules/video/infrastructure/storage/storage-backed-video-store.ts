import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IStorageProvider } from '@modules/storage/domain/interfaces/storage-provider.interface';
import {
  GENERATED_VIDEO_STORE,
  IGeneratedVideoStore,
  StoreVideoContext,
  StoredVideo,
} from '../../domain/interfaces/generated-video-store.port';
import { VideoDelivery, VideoPayload } from '../../domain/interfaces/conversational-video.port';

/**
 * Injection token for the storage backend this adapter writes through. It is
 * bound in VideoEditModule to whichever IStorageProvider the app has selected
 * (local / MinIO / S3), so this class never learns which backend it is on.
 */
export const VIDEO_STORAGE_PROVIDER = Symbol('VIDEO_STORAGE_PROVIDER');

const DOWNLOAD_TIMEOUT_MS = 60_000;

@Injectable()
export class StorageBackedVideoStore implements IGeneratedVideoStore {
  constructor(
    @Inject(VIDEO_STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async persist(payload: VideoPayload, context: StoreVideoContext): Promise<StoredVideo> {
    const buffer = await this.toBuffer(payload);
    const fileName = `${context.turnId}.mp4`;
    const storageKey = [
      'workspaces',
      context.workspaceId,
      'video-sessions',
      context.sessionId,
      fileName,
    ].join('/');

    const stored = await this.storage.upload({
      key: storageKey,
      buffer,
      contentType: payload.mimeType,
    });

    return {
      storageKey: stored.key,
      url: stored.url,
      sizeBytes: buffer.byteLength,
      mimeType: payload.mimeType,
      fileName,
    };
  }

  private async toBuffer(payload: VideoPayload): Promise<Buffer> {
    if (payload.kind === VideoDelivery.INLINE) {
      return Buffer.from(payload.base64, 'base64');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(payload.uri, { signal: controller.signal });
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Could not download generated video (${response.status})`,
        );
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Generated video download failed or timed out');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const GENERATED_VIDEO_STORE_PROVIDER = {
  provide: GENERATED_VIDEO_STORE,
  useClass: StorageBackedVideoStore,
};
