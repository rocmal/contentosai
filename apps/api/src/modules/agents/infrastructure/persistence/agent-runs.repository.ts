import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { AgentRun } from '../../domain/entities/agent-run.entity';
import {
  AgentRunStat,
  CreateAgentRunData,
  IAgentRunsRepository,
  UpdateAgentRunData,
} from '../../domain/repositories/agent-run-repository.interface';
import { AgentRunModel } from './agent-run.model';

@Injectable()
export class AgentRunsRepository
  extends BaseRepository<AgentRunModel, AgentRun, CreateAgentRunData, UpdateAgentRunData>
  implements IAgentRunsRepository
{
  constructor(@InjectModel(AgentRunModel) model: typeof AgentRunModel) {
    super(model);
  }

  async statsByAgent(workspaceId: string): Promise<AgentRunStat[]> {
    const rows = (await this.model.findAll({
      attributes: ['agentId', [fn('COUNT', col('id')), 'runCount'], [fn('MAX', col('createdAt')), 'lastRunAt']],
      where: { workspaceId },
      group: ['agentId'],
      raw: true,
    })) as unknown as { agentId: string; runCount: string | number; lastRunAt: Date | null }[];

    return rows.map((row) => ({
      agentId: row.agentId,
      runCount: Number(row.runCount),
      lastRunAt: row.lastRunAt ? new Date(row.lastRunAt) : null,
    }));
  }

  protected toEntity(instance: AgentRunModel): AgentRun {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      agentId: plain.agentId,
      input: plain.input,
      output: plain.output,
      provider: plain.provider,
      model: plain.model,
      complianceFlags: plain.complianceFlags,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
