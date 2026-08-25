import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { MediaAssetModel } from '@modules/media/infrastructure/persistence/media-asset.model';
import {
  VideoDelivery,
  VideoTask,
  VideoTurnStatus,
} from '../../domain/interfaces/conversational-video.port';
import { GenerationTier } from '@modules/video-credits/domain/enums/generation.enums';
import { VideoEditSessionModel } from './video-edit-session.model';

@Table({ tableName: 'video_edit_turns', version: true })
export class VideoEditTurnModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => VideoEditSessionModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare sessionId: string;

  @Column({ type: DataType.UUID, allowNull: true })
  declare parentTurnId: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare providerTurnId: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare prompt: string;

  @Column({ type: DataType.ENUM(...Object.values(VideoTask)), allowNull: false })
  declare task: VideoTask;

  @Column({
    type: DataType.ENUM(...Object.values(VideoTurnStatus)),
    allowNull: false,
    defaultValue: VideoTurnStatus.IN_PROGRESS,
  })
  declare status: VideoTurnStatus;

  @Column({ type: DataType.ENUM(...Object.values(VideoDelivery)), allowNull: false })
  declare delivery: VideoDelivery;

  @Column({ type: DataType.STRING(1000), allowNull: true })
  declare sourceUri: string | null;

  @ForeignKey(() => MediaAssetModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare mediaAssetId: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare editable: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare failureReason: string | null;

  @Column({
    type: DataType.ENUM(...Object.values(GenerationTier)),
    allowNull: false,
    defaultValue: GenerationTier.FAST,
  })
  declare tier: GenerationTier;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: 'realistic' })
  declare style: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 8 })
  declare durationSeconds: number;

  @Column({ type: DataType.UUID, allowNull: true })
  declare creditReservationId: string | null;
}
