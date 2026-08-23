import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { VideoProject } from '../../domain/entities/video-project.entity';
import {
  CreateVideoProjectData,
  IVideoProjectsRepository,
  UpdateVideoProjectData,
} from '../../domain/repositories/video-project-repository.interface';
import { VideoProjectModel } from './video-project.model';

@Injectable()
export class VideoProjectsRepository
  extends BaseRepository<
    VideoProjectModel,
    VideoProject,
    CreateVideoProjectData,
    UpdateVideoProjectData
  >
  implements IVideoProjectsRepository
{
  constructor(@InjectModel(VideoProjectModel) model: typeof VideoProjectModel) {
    super(model);
  }

  protected toEntity(instance: VideoProjectModel): VideoProject {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      title: plain.title,
      source: plain.source,
      status: plain.status,
      scenes: plain.scenes,
      aspectRatio: plain.aspectRatio,
      transition: plain.transition,
      narrationText: plain.narrationText,
      narrationVoiceId: plain.narrationVoiceId,
      narrationGender: plain.narrationGender,
      narrationLanguage: plain.narrationLanguage,
      finalAssetId: plain.finalAssetId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
