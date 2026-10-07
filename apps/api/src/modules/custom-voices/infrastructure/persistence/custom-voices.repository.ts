import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { CustomVoice } from '../../domain/entities/custom-voice.entity';
import {
  CreateCustomVoiceData,
  ICustomVoicesRepository,
  UpdateCustomVoiceData,
} from '../../domain/repositories/custom-voice-repository.interface';
import { CustomVoiceModel } from './custom-voice.model';

@Injectable()
export class CustomVoicesRepository
  extends BaseRepository<
    CustomVoiceModel,
    CustomVoice,
    CreateCustomVoiceData,
    UpdateCustomVoiceData
  >
  implements ICustomVoicesRepository
{
  constructor(@InjectModel(CustomVoiceModel) model: typeof CustomVoiceModel) {
    super(model);
  }

  protected toEntity(instance: CustomVoiceModel): CustomVoice {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      name: plain.name,
      provider: plain.provider,
      providerVoiceId: plain.providerVoiceId,
      sampleStorageKey: plain.sampleStorageKey,
      consentConfirmedAt: plain.consentConfirmedAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
