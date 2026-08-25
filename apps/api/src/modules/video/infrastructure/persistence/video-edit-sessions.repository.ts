import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { VideoEditSession } from '../../domain/entities/video-edit-session.entity';
import {
  CreateVideoEditSessionData,
  IVideoEditSessionsRepository,
  UpdateVideoEditSessionData,
} from '../../domain/repositories/video-edit-session-repository.interface';
import { VideoEditSessionModel } from './video-edit-session.model';

@Injectable()
export class VideoEditSessionsRepository
  extends BaseRepository<
    VideoEditSessionModel,
    VideoEditSession,
    CreateVideoEditSessionData,
    UpdateVideoEditSessionData
  >
  implements IVideoEditSessionsRepository
{
  constructor(@InjectModel(VideoEditSessionModel) model: typeof VideoEditSessionModel) {
    super(model);
  }

  async findOwned(id: string, actorId: string): Promise<VideoEditSession | null> {
    return this.findOne({ id, createdBy: actorId });
  }

  protected toEntity(instance: VideoEditSessionModel): VideoEditSession {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      title: plain.title,
      provider: plain.provider,
      modelId: plain.modelId,
      aspectRatio: plain.aspectRatio,
      status: plain.status,
      rootTurnId: plain.rootTurnId,
      latestTurnId: plain.latestTurnId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
