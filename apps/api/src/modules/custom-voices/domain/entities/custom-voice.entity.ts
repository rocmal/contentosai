import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface CustomVoice extends BaseTenantEntity {
  name: string;
  /** Voice provider that holds the clone, e.g. "elevenlabs". */
  provider: string;
  /** The id text-to-speech uses to speak in this voice; null while it is only a saved recording. */
  providerVoiceId: string | null;
  sampleStorageKey: string | null;
  consentConfirmedAt: Date;
}
