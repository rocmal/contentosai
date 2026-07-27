import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { IntegrationStatus } from '../../domain/entities/integration.entity';

@Table({ tableName: 'integrations', version: true })
export class IntegrationModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare provider: string;

  @Column({
    type: DataType.ENUM(...Object.values(IntegrationStatus)),
    allowNull: false,
    defaultValue: IntegrationStatus.DISCONNECTED,
  })
  declare status: IntegrationStatus;

  // Ciphertext only - never decrypted into a response DTO.
  @Column({ type: DataType.TEXT, allowNull: true })
  declare encryptedCredentials: string | null;
}
