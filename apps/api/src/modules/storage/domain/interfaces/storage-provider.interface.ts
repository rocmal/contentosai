export interface UploadFileInput {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface StoredFile {
  key: string;
  url: string;
}

/** Port every storage backend (local disk, MinIO, S3) implements. */
export interface IStorageProvider {
  readonly name: string;
  upload(input: UploadFileInput): Promise<StoredFile>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
