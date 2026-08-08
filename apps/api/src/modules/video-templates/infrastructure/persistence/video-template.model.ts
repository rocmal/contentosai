import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { VideoTemplateVisibility } from '../../domain/entities/video-template.entity';

@Table({ tableName: 'video_templates', version: true })
export class VideoTemplateModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare title: string;

  @Column({ type: DataType.STRING(1000), allowNull: false })
  declare videoUrl: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  declare storageKey: string;

  @Column({ type: DataType.STRING(1000), allowNull: true })
  declare thumbnailUrl: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: '16:9' })
  declare aspectRatio: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare durationSeconds: number | null;

  @Column({
    type: DataType.ENUM(...Object.values(VideoTemplateVisibility)),
    allowNull: false,
    defaultValue: VideoTemplateVisibility.PRIVATE,
  })
  declare visibility: VideoTemplateVisibility;
}
