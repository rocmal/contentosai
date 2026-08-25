import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { VideoEditTurn } from '../../domain/entities/video-edit-turn.entity';
import {
  CreateVideoEditTurnData,
  IVideoEditTurnsRepository,
  UpdateVideoEditTurnData,
} from '../../domain/repositories/video-edit-turn-repository.interface';
import { VideoTurnStatus } from '../../domain/interfaces/conversational-video.port';
import { VideoEditTurnModel } from './video-edit-turn.model';

@Injectable()
export class VideoEditTurnsRepository
  extends BaseRepository<
    VideoEditTurnModel,
    VideoEditTurn,
    CreateVideoEditTurnData,
    UpdateVideoEditTurnData
  >
  implements IVideoEditTurnsRepository
{
  constructor(@InjectModel(VideoEditTurnModel) model: typeof VideoEditTurnModel) {
    super(model);
  }

  async findBySession(sessionId: string): Promise<VideoEditTurn[]> {
    const instances = await this.model.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
    });
    return instances.map((instance) => this.toEntity(instance));
  }

  async findByProviderTurnId(providerTurnId: string): Promise<VideoEditTurn | null> {
    return this.findOne({ providerTurnId });
  }

  async findStaleInProgress(olderThan: Date, limit: number): Promise<VideoEditTurn[]> {
    const instances = await this.model.findAll({
      where: {
        status: VideoTurnStatus.IN_PROGRESS,
        createdAt: { [Op.lt]: olderThan },
      },
      order: [['createdAt', 'ASC']],
      limit,
    });
    return instances.map((instance) => this.toEntity(instance));
  }

  protected toEntity(instance: VideoEditTurnModel): VideoEditTurn {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      sessionId: plain.sessionId,
      parentTurnId: plain.parentTurnId,
      providerTurnId: plain.providerTurnId,
      prompt: plain.prompt,
      task: plain.task,
      status: plain.status,
      delivery: plain.delivery,
      sourceUri: plain.sourceUri,
      mediaAssetId: plain.mediaAssetId,
      editable: plain.editable,
      failureReason: plain.failureReason,
      tier: plain.tier,
      style: plain.style as VideoEditTurn['style'],
      durationSeconds: plain.durationSeconds,
      creditReservationId: plain.creditReservationId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
