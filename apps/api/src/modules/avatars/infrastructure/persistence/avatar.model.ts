import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { AvatarAgeGroup, AvatarCategory, AvatarGender } from '../../domain/entities/avatar.entity';

@Table({ tableName: 'avatars', version: true })
export class AvatarModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(180), allowNull: false })
  declare slug: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.STRING(1000), allowNull: false })
  declare imageUrl: string;

  @Column({ type: DataType.STRING(1000), allowNull: true })
  declare thumbnailUrl: string | null;

  @Column({ type: DataType.ENUM(...Object.values(AvatarCategory)), allowNull: false })
  declare category: AvatarCategory;

  @Column({ type: DataType.ENUM(...Object.values(AvatarGender)), allowNull: false })
  declare gender: AvatarGender;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare language: string | null;

  @Column({ type: DataType.JSON, allowNull: false })
  declare tags: string[];

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare voiceId: string | null;

  @Column({ type: DataType.STRING(80), allowNull: true })
  declare emotionDefault: string | null;

  @Column({ type: DataType.ENUM(...Object.values(AvatarAgeGroup)), allowNull: false })
  declare ageGroup: AvatarAgeGroup;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isFavorite: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPublic: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isArchived: boolean;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare qualityScore: number | null;

  @Column({ type: DataType.STRING(80), allowNull: false })
  declare provider: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare providerAvatarId: string | null;

  @Column({ type: DataType.JSON, allowNull: false })
  declare metadata: Record<string, unknown>;
}
