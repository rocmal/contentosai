import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { VideoTemplate } from '../../domain/entities/video-template.entity';
import {
  CreateVideoTemplateData,
  IVideoTemplatesRepository,
  UpdateVideoTemplateData,
} from '../../domain/repositories/video-template-repository.interface';
import { VideoTemplateModel } from './video-template.model';

@Injectable()
export class VideoTemplatesRepository
  extends BaseRepository<
    VideoTemplateModel,
    VideoTemplate,
    CreateVideoTemplateData,
    UpdateVideoTemplateData
  >
  implements IVideoTemplatesRepository
{
  constructor(@InjectModel(VideoTemplateModel) model: typeof VideoTemplateModel) {
    super(model);
  }

  protected toEntity(instance: VideoTemplateModel): VideoTemplate {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      title: plain.title,
      videoUrl: plain.videoUrl,
      storageKey: plain.storageKey,
      thumbnailUrl: plain.thumbnailUrl,
      aspectRatio: plain.aspectRatio,
      durationSeconds: plain.durationSeconds,
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
