import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum AutomationWorkflowStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface AutomationWorkflow extends BaseTenantEntity {
  name: string;
  trigger: string;
  status: AutomationWorkflowStatus;
  config: Record<string, unknown> | null;
}
