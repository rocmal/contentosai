import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { AutomationWorkflowStatus } from '../../domain/entities/automation-workflow.entity';

@Table({ tableName: 'automation_workflows', version: true })
export class AutomationWorkflowModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare trigger: string;

  @Column({
    type: DataType.ENUM(...Object.values(AutomationWorkflowStatus)),
    allowNull: false,
    defaultValue: AutomationWorkflowStatus.INACTIVE,
  })
  declare status: AutomationWorkflowStatus;

  @Column({ type: DataType.JSON, allowNull: true })
  declare config: Record<string, unknown> | null;
}
