import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';

@Table({ tableName: 'brand_profiles', version: true })
export class BrandProfileModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare industry: string | null;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare toneOfVoice: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare brandColors: string[] | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare logoUrl: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare guidelines: string | null;
}
