import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { AIProviderFactory } from '@modules/ai/infrastructure/ai-provider.factory';
import { AIContentGeneratedEvent } from '@modules/ai/application/events/ai-content-generated.event';
import { LANGUAGE_INSTRUCTIONS } from '@modules/ai/application/content-studio/content-formats';
import {
  buildBrandPromptParts,
  isRegulatedBrand,
} from '@modules/ai/application/content-studio/brand-context';
import { scanForComplianceIssues } from '@modules/ai/application/content-studio/compliance';
import { BrandProfilesService } from '@modules/brand/application/services/brand-profiles.service';
import { BrandProfile } from '@modules/brand/domain/entities/brand-profile.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { CREDIT_COST } from '@modules/credits/credits.constants';
import { AGENT_CATALOG, AgentDefinition } from '../agent-catalog';
import { AgentRun } from '../../domain/entities/agent-run.entity';
import {
  AGENT_RUNS_REPOSITORY,
  IAgentRunsRepository,
} from '../../domain/repositories/agent-run-repository.interface';
import { RunAgentDto } from '../dto/run-agent.dto';

export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  description: string;
  inputHint: string;
  runCount: number;
  lastRunAt: Date | null;
}

@Injectable()
export class AgentsService {
  constructor(
    @Inject(AGENT_RUNS_REPOSITORY) private readonly runsRepository: IAgentRunsRepository,
    private readonly providerFactory: AIProviderFactory,
    private readonly brandProfilesService: BrandProfilesService,
    private readonly creditsService: CreditsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listAgents(user: AuthenticatedUser): Promise<AgentSummary[]> {
    const stats = user.workspaceId ? await this.runsRepository.statsByAgent(user.workspaceId) : [];
    const statById = new Map(stats.map((s) => [s.agentId, s]));
    return AGENT_CATALOG.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      inputHint: agent.inputHint,
      runCount: statById.get(agent.id)?.runCount ?? 0,
      lastRunAt: statById.get(agent.id)?.lastRunAt ?? null,
    }));
  }

  async listRuns(
    user: AuthenticatedUser,
    options: { agentId?: string; page?: number; limit?: number },
  ): Promise<PaginatedResult<AgentRun>> {
    return this.runsRepository.findAll({
      page: options.page,
      limit: options.limit,
      filters: {
        ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}),
        ...(options.agentId ? { agentId: options.agentId } : {}),
      },
    });
  }

  async run(agentId: string, dto: RunAgentDto, user: AuthenticatedUser): Promise<AgentRun> {
    const agent = AGENT_CATALOG.find((a) => a.id === agentId);
    if (!agent) {
      throw new NotFoundException(`Agent "${agentId}" not found`);
    }
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException('Your account is not attached to an organization workspace yet.');
    }

    const brand = await this.loadBrandProfile(user.workspaceId);
    const provider = this.providerFactory.getProvider(dto.provider);

    // Reserve before the paid call and refund on failure, like every other generation.
    const cost = CREDIT_COST.TEXT_PER_GENERATION;
    await this.creditsService.reserve({
      organizationId: user.organizationId,
      workspaceId: user.workspaceId,
      amount: cost,
      reason: CreditTransactionReason.GENERATION_TEXT,
      userId: user.id,
    });

    let output: string;
    let model: string;
    try {
      const result = await provider.generateText({
        systemPrompt: this.buildSystemPrompt(agent, dto, brand),
        prompt: dto.input,
        maxTokens: 3000,
        temperature: 0.6,
      });
      output = result.text.trim();
      model = result.model;
      if (!output) {
        throw new BadRequestException('The AI provider returned an empty response. Please try again.');
      }
    } catch (err) {
      await this.creditsService.refund({
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        amount: cost,
        userId: user.id,
      });
      throw err;
    }

    this.eventEmitter.emit('ai.content-generated', new AIContentGeneratedEvent(provider.name, model, user.id));

    // The reviewer quotes offending text in its own output, so scan what the
    // user submitted; every other agent is scanned on what it produced.
    const scanned = agent.id === 'compliance' ? dto.input : output;
    const flags = isRegulatedBrand(brand) ? scanForComplianceIssues(scanned) : [];

    return this.runsRepository.create(
      {
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        agentId: agent.id,
        input: dto.input,
        output,
        provider: provider.name,
        model,
        complianceFlags: flags.length > 0 ? flags : null,
      },
      user.id,
    );
  }

  private async loadBrandProfile(workspaceId: string): Promise<BrandProfile | null> {
    const profiles = await this.brandProfilesService.findByWorkspace(workspaceId);
    return profiles[0] ?? null;
  }

  private buildSystemPrompt(agent: AgentDefinition, dto: RunAgentDto, brand: BrandProfile | null): string {
    return [
      `You are the ${agent.name} (${agent.role}) inside Lumora, working for the brand described below. Follow the brand voice and every rule in the guidelines exactly.`,
      ...buildBrandPromptParts(brand),
      `TASK\n${agent.instructions}`,
      `LANGUAGE: ${LANGUAGE_INSTRUCTIONS[dto.language ?? 'english']}`,
      'FACT DISCIPLINE: Use only facts, product names and figures that appear in the user input. Never invent product names, premiums, benefits, returns or statistics. If a detail is missing, write a clearly marked placeholder like [VERIFY: detail]. Write plain text with simple headings; no markdown tables.',
    ].join('\n\n');
  }
}
