import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { VideoEditSessionStatus } from '../../domain/entities/video-edit-session.entity';
import { VideoAspectRatio } from '../../domain/interfaces/conversational-video.port';

@Table({ tableName: 'video_edit_sessions', version: true })
export class VideoEditSessionModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare title: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare provider: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare modelId: string;

  @Column({ type: DataType.ENUM(...Object.values(VideoAspectRatio)), allowNull: false })
  declare aspectRatio: VideoAspectRatio;

  @Column({
    type: DataType.ENUM(...Object.values(VideoEditSessionStatus)),
    allowNull: false,
    defaultValue: VideoEditSessionStatus.ACTIVE,
  })
  declare status: VideoEditSessionStatus;

  @Column({ type: DataType.UUID, allowNull: true })
  declare rootTurnId: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare latestTurnId: string | null;
}
