import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { MediaAssetType } from '../../domain/entities/media-asset.entity';

@Table({ tableName: 'media_assets', version: true })
export class MediaAssetModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare fileName: string;

  @Column({ type: DataType.STRING(500), allowNull: false })
  declare storageKey: string;

  @Column({ type: DataType.STRING(1000), allowNull: false })
  declare url: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare mimeType: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare sizeBytes: number;

  @Column({ type: DataType.ENUM(...Object.values(MediaAssetType)), allowNull: false })
  declare type: MediaAssetType;
}
