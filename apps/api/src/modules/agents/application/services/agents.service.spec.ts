import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { AIProviderFactory } from '@modules/ai/infrastructure/ai-provider.factory';
import { BrandProfilesService } from '@modules/brand/application/services/brand-profiles.service';
import { BrandProfile } from '@modules/brand/domain/entities/brand-profile.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { AgentsService } from './agents.service';
import { IAgentRunsRepository } from '../../domain/repositories/agent-run-repository.interface';

const user: AuthenticatedUser = {
  id: 'user-1',
  email: 'u@example.com',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  roles: [],
  permissions: [],
};

const insuranceBrand = {
  name: 'LIC',
  industry: 'Life Insurance',
  guidelines: 'COMPLIANCE RULES: never promise returns',
} as unknown as BrandProfile;

describe('AgentsService', () => {
  let service: AgentsService;
  let runs: jest.Mocked<IAgentRunsRepository>;
  let generateText: jest.Mock;
  let credits: { reserve: jest.Mock; refund: jest.Mock };
  let brands: { findByWorkspace: jest.Mock };

  beforeEach(() => {
    generateText = jest.fn().mockResolvedValue({ text: 'Agent output', provider: 'gemini', model: 'm1' });
    credits = { reserve: jest.fn().mockResolvedValue(undefined), refund: jest.fn().mockResolvedValue(undefined) };
    brands = { findByWorkspace: jest.fn().mockResolvedValue([insuranceBrand]) };
    runs = {
      create: jest.fn().mockImplementation(async (data) => ({ id: 'run-1', ...data })),
      statsByAgent: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IAgentRunsRepository>;

    service = new AgentsService(
      runs,
      { getProvider: jest.fn().mockReturnValue({ name: 'gemini', generateText }) } as unknown as AIProviderFactory,
      brands as unknown as BrandProfilesService,
      credits as unknown as CreditsService,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
  });

  it('rejects an unknown agent without charging credits', async () => {
    await expect(service.run('nope', { input: 'hello there' }, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(credits.reserve).not.toHaveBeenCalled();
  });

  it('reserves a credit, saves the run and includes the brand rules in the prompt', async () => {
    const run = await service.run('content', { input: 'Write a post about term insurance' }, user);

    expect(credits.reserve).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0][0].systemPrompt).toContain('never promise returns');
    expect(run).toMatchObject({ agentId: 'content', output: 'Agent output', workspaceId: 'ws-1' });
  });

  it('refunds the credit and saves nothing when the provider fails', async () => {
    generateText.mockRejectedValue(new Error('provider down'));

    await expect(service.run('content', { input: 'Write a post' }, user)).rejects.toThrow('provider down');

    expect(credits.refund).toHaveBeenCalledTimes(1);
    expect(runs.create).not.toHaveBeenCalled();
  });

  it('scans the submitted draft (not the review) for the compliance agent', async () => {
    generateText.mockResolvedValue({ text: 'Verdict: Do not publish', provider: 'gemini', model: 'm1' });

    await service.run('compliance', { input: 'Double your money with our plan!' }, user);

    const saved = runs.create.mock.calls[0][0];
    expect(saved.complianceFlags?.some((f) => f.severity === 'block')).toBe(true);
  });

  it('does not scan for unregulated brands', async () => {
    brands.findByWorkspace.mockResolvedValue([{ name: 'Acme', industry: 'SaaS', guidelines: null }]);
    generateText.mockResolvedValue({ text: 'Double your money!', provider: 'gemini', model: 'm1' });

    await service.run('content', { input: 'Write something' }, user);

    expect(runs.create.mock.calls[0][0].complianceFlags).toBeNull();
  });
});
