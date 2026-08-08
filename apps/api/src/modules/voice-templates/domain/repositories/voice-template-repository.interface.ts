import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { VoiceTemplate, VoiceTemplateVisibility } from '../entities/voice-template.entity';

export interface CreateVoiceTemplateData {
  organizationId: string;
  workspaceId: string;
  name: string;
  provider: string;
  voiceId: string;
  language: string;
  visibility?: VoiceTemplateVisibility;
}

export type UpdateVoiceTemplateData = Partial<
  Omit<CreateVoiceTemplateData, 'organizationId' | 'workspaceId'>
>;

export const VOICE_TEMPLATES_REPOSITORY = Symbol('VOICE_TEMPLATES_REPOSITORY');

export type IVoiceTemplatesRepository = IBaseRepository<
  VoiceTemplate,
  CreateVoiceTemplateData,
  UpdateVoiceTemplateData
>;
