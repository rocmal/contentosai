import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { BrandSocialAccount } from '../../domain/entities/brand-profile.entity';

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

  @Column({ type: DataType.STRING(300), allowNull: true })
  declare tagline: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare toneOfVoice: string[] | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare brandColors: string[] | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare logoUrl: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare guidelines: string | null;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare websiteUrl: string | null;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare primaryFont: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare productsAndServices: string[] | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare mission: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare vision: string | null;

  @Column({ type: DataType.STRING(200), allowNull: true })
  declare primaryCTA: string | null;

  @Column({ type: DataType.STRING(300), allowNull: true })
  declare targetAudience: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare competitors: string[] | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare keywords: string[] | null;

  @Column({ type: DataType.JSON, allowNull: true })
  declare socialAccounts: BrandSocialAccount[] | null;
}
