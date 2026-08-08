import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  VoiceTemplate,
  VoiceTemplateVisibility,
} from '../../domain/entities/voice-template.entity';
import {
  IVoiceTemplatesRepository,
  VOICE_TEMPLATES_REPOSITORY,
} from '../../domain/repositories/voice-template-repository.interface';
import { CreateVoiceTemplateDto } from '../dto/create-voice-template.dto';
import { VoiceTemplateCreatedEvent } from '../events/voice-template-created.event';

@Injectable()
export class VoiceTemplatesService {
  constructor(
    @Inject(VOICE_TEMPLATES_REPOSITORY)
    private readonly voiceTemplatesRepository: IVoiceTemplatesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateVoiceTemplateDto, actorId?: string): Promise<VoiceTemplate> {
    const voiceTemplate = await this.voiceTemplatesRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        name: dto.name,
        provider: dto.provider,
        voiceId: dto.voiceId,
        language: dto.language,
        visibility: dto.visibility,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'voice-templates.created',
      new VoiceTemplateCreatedEvent(voiceTemplate.id, voiceTemplate.workspaceId),
    );

    return voiceTemplate;
  }

  /** Templates this user can pick from: every "team" template in their
   * workspace, plus their own "private" ones - bounded to a generous page
   * size since this is a picker list, not a paginated table. */
  async findAvailableForUser(workspaceId: string, userId: string): Promise<VoiceTemplate[]> {
    const result = await this.voiceTemplatesRepository.findAll({
      limit: 200,
      filters: { workspaceId },
    });
    return result.items.filter(
      (template) =>
        template.visibility === VoiceTemplateVisibility.TEAM || template.createdBy === userId,
    );
  }

  async findById(id: string): Promise<VoiceTemplate> {
    const voiceTemplate = await this.voiceTemplatesRepository.findById(id);
    if (!voiceTemplate) {
      throw new NotFoundException(`VoiceTemplate with id "${id}" not found`);
    }
    return voiceTemplate;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const voiceTemplate = await this.findById(id);
    if (voiceTemplate.createdBy !== actorId) {
      throw new ForbiddenException('Only the creator can delete this template');
    }
    await this.voiceTemplatesRepository.delete(id, actorId);
  }
}
