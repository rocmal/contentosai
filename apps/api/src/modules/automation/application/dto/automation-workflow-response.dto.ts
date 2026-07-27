import { ApiProperty } from '@nestjs/swagger';
import {
  AutomationWorkflow,
  AutomationWorkflowStatus,
} from '../../domain/entities/automation-workflow.entity';

export class AutomationWorkflowResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() name: string;
  @ApiProperty() trigger: string;
  @ApiProperty({ enum: AutomationWorkflowStatus }) status: AutomationWorkflowStatus;
  @ApiProperty({ type: Object, nullable: true }) config: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(automationWorkflow: AutomationWorkflow) {
    this.id = automationWorkflow.id;
    this.organizationId = automationWorkflow.organizationId;
    this.workspaceId = automationWorkflow.workspaceId;
    this.name = automationWorkflow.name;
    this.trigger = automationWorkflow.trigger;
    this.status = automationWorkflow.status;
    this.config = automationWorkflow.config;
    this.createdAt = automationWorkflow.createdAt;
    this.updatedAt = automationWorkflow.updatedAt;
  }
}
