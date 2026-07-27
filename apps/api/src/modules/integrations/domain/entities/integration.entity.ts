import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum IntegrationStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

export interface Integration extends BaseTenantEntity {
  provider: string;
  status: IntegrationStatus;
  /** Ciphertext only (AES-256-GCM via EncryptionService) - never decrypted into a response DTO. */
  encryptedCredentials: string | null;
}
