import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface AgentRunFlag {
  severity: 'block' | 'warn';
  message: string;
  match: string;
}

export interface AgentRun extends BaseTenantEntity {
  agentId: string;
  input: string;
  output: string;
  provider: string;
  model: string;
  complianceFlags: AgentRunFlag[] | null;
}
