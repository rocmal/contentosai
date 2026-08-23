import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { MediaAssetModel } from '@modules/media/infrastructure/persistence/media-asset.model';
import {
  VideoProjectScene,
  VideoProjectSource,
  VideoProjectStatus,
} from '../../domain/entities/video-project.entity';

@Table({ tableName: 'video_projects', version: true })
export class VideoProjectModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(150), allowNull: false, defaultValue: 'Untitled video' })
  declare title: string;

  @Column({
    type: DataType.ENUM(...Object.values(VideoProjectSource)),
    allowNull: false,
    defaultValue: VideoProjectSource.SCENES,
  })
  declare source: VideoProjectSource;

  @Column({
    type: DataType.ENUM(...Object.values(VideoProjectStatus)),
    allowNull: false,
    defaultValue: VideoProjectStatus.DRAFT,
  })
  declare status: VideoProjectStatus;

  @Column({ type: DataType.JSON, allowNull: false, defaultValue: [] })
  declare scenes: VideoProjectScene[];

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: '16:9' })
  declare aspectRatio: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'none' })
  declare transition: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare narrationText: string | null;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare narrationVoiceId: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare narrationGender: string | null;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare narrationLanguage: string | null;

  @ForeignKey(() => MediaAssetModel)
  @Column({ type: DataType.UUID, allowNull: true })
  declare finalAssetId: string | null;
}
