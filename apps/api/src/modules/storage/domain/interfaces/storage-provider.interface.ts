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
  /** Raw bytes for a stored key - used when a cached generation result
   * needs to be served back out in its original (e.g. base64) form. */
  read(key: string): Promise<Buffer>;
}
