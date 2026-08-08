import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { VoiceTemplate } from '../../domain/entities/voice-template.entity';
import {
  CreateVoiceTemplateData,
  IVoiceTemplatesRepository,
  UpdateVoiceTemplateData,
} from '../../domain/repositories/voice-template-repository.interface';
import { VoiceTemplateModel } from './voice-template.model';

@Injectable()
export class VoiceTemplatesRepository
  extends BaseRepository<
    VoiceTemplateModel,
    VoiceTemplate,
    CreateVoiceTemplateData,
    UpdateVoiceTemplateData
  >
  implements IVoiceTemplatesRepository
{
  constructor(@InjectModel(VoiceTemplateModel) model: typeof VoiceTemplateModel) {
    super(model);
  }

  protected toEntity(instance: VoiceTemplateModel): VoiceTemplate {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      name: plain.name,
      provider: plain.provider,
      voiceId: plain.voiceId,
      language: plain.language,
      visibility: plain.visibility,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
