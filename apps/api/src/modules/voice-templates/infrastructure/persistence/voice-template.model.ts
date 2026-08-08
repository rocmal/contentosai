import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { VoiceTemplateVisibility } from '../../domain/entities/voice-template.entity';

@Table({ tableName: 'voice_templates', version: true })
export class VoiceTemplateModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(80), allowNull: false })
  declare provider: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare voiceId: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare language: string;

  @Column({
    type: DataType.ENUM(...Object.values(VoiceTemplateVisibility)),
    allowNull: false,
    defaultValue: VoiceTemplateVisibility.PRIVATE,
  })
  declare visibility: VoiceTemplateVisibility;
}
