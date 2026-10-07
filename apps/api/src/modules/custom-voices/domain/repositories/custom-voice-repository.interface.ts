import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { CustomVoice } from '../entities/custom-voice.entity';

export interface CreateCustomVoiceData {
  organizationId: string;
  workspaceId: string;
  name: string;
  provider: string;
  providerVoiceId: string;
  sampleStorageKey?: string | null;
  consentConfirmedAt: Date;
}

export type UpdateCustomVoiceData = Partial<
  Omit<CreateCustomVoiceData, 'organizationId' | 'workspaceId'>
>;

export const CUSTOM_VOICES_REPOSITORY = Symbol('CUSTOM_VOICES_REPOSITORY');

export type ICustomVoicesRepository = IBaseRepository<
  CustomVoice,
  CreateCustomVoiceData,
  UpdateCustomVoiceData
>;
