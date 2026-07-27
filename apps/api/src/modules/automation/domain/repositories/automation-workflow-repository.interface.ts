import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import {
  AutomationWorkflow,
  AutomationWorkflowStatus,
} from '../entities/automation-workflow.entity';

export interface CreateAutomationWorkflowData {
  organizationId: string;
  workspaceId: string;
  name: string;
  trigger: string;
  status?: AutomationWorkflowStatus;
  config?: Record<string, unknown> | null;
}

export type UpdateAutomationWorkflowData = Partial<
  Omit<CreateAutomationWorkflowData, 'organizationId' | 'workspaceId'>
>;

export const AUTOMATION_WORKFLOWS_REPOSITORY = Symbol('AUTOMATION_WORKFLOWS_REPOSITORY');

export type IAutomationWorkflowsRepository = IBaseRepository<
  AutomationWorkflow,
  CreateAutomationWorkflowData,
  UpdateAutomationWorkflowData
>;
