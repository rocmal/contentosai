import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum VoiceTemplateVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
}

export interface VoiceTemplate extends BaseTenantEntity {
  name: string;
  provider: string;
  voiceId: string;
  language: string;
  visibility: VoiceTemplateVisibility;
}
