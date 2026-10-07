import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface CustomVoice extends BaseTenantEntity {
  name: string;
  /** Voice provider that holds the clone, e.g. "elevenlabs". */
  provider: string;
  /** The id text-to-speech uses to speak in this voice. */
  providerVoiceId: string;
  sampleStorageKey: string | null;
  consentConfirmedAt: Date;
}
