import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateAutomationWorkflowDto } from './create-automation-workflow.dto';
import { AutomationWorkflowStatus } from '../../domain/entities/automation-workflow.entity';

export class UpdateAutomationWorkflowDto extends PartialType(
  OmitType(CreateAutomationWorkflowDto, ['organizationId', 'workspaceId'] as const),
) {
  @ApiPropertyOptional({ enum: AutomationWorkflowStatus })
  @IsOptional()
  @IsEnum(AutomationWorkflowStatus)
  status?: AutomationWorkflowStatus;
}
