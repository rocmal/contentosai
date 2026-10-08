import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { BrandProfilesService } from '@modules/brand/application/services/brand-profiles.service';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { AIContentGeneratedEvent } from '../events/ai-content-generated.event';
import { CopilotMessageDto } from '../dto/copilot.dto';
import { buildBrandPromptParts } from '../content-studio/brand-context';
import { runWithTextCredit } from '../credited-run';

const SCREEN_LABELS: Record<string, string> = {
  dashboard: 'the Dashboard',
  'ai-studio': 'AI Studio (content generation wizard)',
  'brand-brain': 'Brand Brain',
  campaigns: 'Campaigns',
  projects: 'Projects',
  calendar: 'the Content Calendar',
  agents: 'AI Agents',
  'video-studio': 'Video Studio',
  'image-studio': 'Image Studio',
  'voice-studio': 'Voice Studio',
};

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly brandProfilesService: BrandProfilesService,
    private readonly creditsService: CreditsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async reply(dto: CopilotMessageDto, user: AuthenticatedUser): Promise<{ reply: string }> {
    // Each stage is tagged so an unexpected 500 in production can be traced to brand lookup, credits or the provider.
    let stage = 'brand-lookup';
    try {
      const profiles = user.workspaceId ? await this.brandProfilesService.findByWorkspace(user.workspaceId) : [];
      stage = 'provider-select';
      const provider = this.providerFactory.getProviderFor({ text: dto.message });

      const systemPrompt = [
        'You are Lumora Co-pilot, a concise, practical assistant inside the Lumora content platform. Help the user write, edit and plan content, and explain how to use the platform. Answer briefly and plainly.',
        ...buildBrandPromptParts(profiles[0] ?? null),
        `The user is currently on ${SCREEN_LABELS[dto.screen ?? ''] ?? 'the app'}.`,
        'Do not invent facts, figures, product details or platform features you are not sure exist. If you do not know, say so. If the brand guidelines above contain rules, follow them in anything you draft.',
      ].join('\n\n');

      const transcript = [
        ...(dto.history ?? []).map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.text}`),
        `User: ${dto.message}`,
      ].join('\n');

      stage = 'credits-or-generation';
      const result = await runWithTextCredit(this.creditsService, user, () =>
        provider.generateText({ systemPrompt, prompt: transcript, maxTokens: 800, temperature: 0.6 }),
      );

      stage = 'emit-event';
      this.eventEmitter.emit(
        'ai.content-generated',
        new AIContentGeneratedEvent(result.provider, result.model, user.id),
      );
      return { reply: result.text.trim() };
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `Co-pilot failed at stage "${stage}" (user ${user.id}, workspace ${user.workspaceId ?? 'none'}): ${e.message}`,
        e.stack,
      );
      throw err;
    }
  }
}
