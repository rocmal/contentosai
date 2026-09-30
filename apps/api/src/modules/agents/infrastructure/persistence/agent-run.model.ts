import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@database/base.model';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { AgentRunFlag } from '../../domain/entities/agent-run.entity';

@Table({ tableName: 'agent_runs', version: true })
export class AgentRunModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare organizationId: string;

  @ForeignKey(() => WorkspaceModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare workspaceId: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  declare agentId: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare input: string;

  @Column({ type: DataType.TEXT('long'), allowNull: false })
  declare output: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  declare provider: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare model: string;

  @Column({ type: DataType.JSON, allowNull: true })
  declare complianceFlags: AgentRunFlag[] | null;
}
