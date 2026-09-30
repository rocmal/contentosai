import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { AgentRun } from '../entities/agent-run.entity';

export interface CreateAgentRunData {
  organizationId: string;
  workspaceId: string;
  agentId: string;
  input: string;
  output: string;
  provider: string;
  model: string;
  complianceFlags: AgentRun['complianceFlags'];
}

export type UpdateAgentRunData = Partial<Pick<CreateAgentRunData, 'output'>>;

export const AGENT_RUNS_REPOSITORY = Symbol('AGENT_RUNS_REPOSITORY');

export interface AgentRunStat {
  agentId: string;
  runCount: number;
  lastRunAt: Date | null;
}

export interface IAgentRunsRepository
  extends IBaseRepository<AgentRun, CreateAgentRunData, UpdateAgentRunData> {
  statsByAgent(workspaceId: string): Promise<AgentRunStat[]>;
}
