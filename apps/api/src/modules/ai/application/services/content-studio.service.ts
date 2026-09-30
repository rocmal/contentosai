import { BadGatewayException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { BrandProfilesService } from '@modules/brand/application/services/brand-profiles.service';
import { BrandProfile } from '@modules/brand/domain/entities/brand-profile.entity';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { CREDIT_COST } from '@modules/credits/credits.constants';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { AIContentGeneratedEvent } from '../events/ai-content-generated.event';
import { StudioGenerateDto } from '../dto/studio-generate.dto';
import { CONTENT_FORMATS, LANGUAGE_INSTRUCTIONS } from '../content-studio/content-formats';
import {
  ComplianceFlag,
  INSURANCE_DISCLAIMER,
  scanForComplianceIssues,
} from '../content-studio/compliance';

export interface StudioGenerateResult {
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  visualPrompt: string;
  suggestedPlatforms: string[];
  /** Advisor identity line + disclaimer, appended by the server (never by the model). */
  footer: string;
  compliance: { regulated: boolean; flags: ComplianceFlag[] };
  provider: string;
  model: string;
}

interface ParsedOutput {
  headline?: unknown;
  body?: unknown;
  hashtags?: unknown;
  cta?: unknown;
  visualPrompt?: unknown;
  suggestedPlatforms?: unknown;
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];

/** Models often wrap JSON in code fences or add a sentence around it. */
function parseModelJson(text: string): ParsedOutput | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as ParsedOutput) : null;
  } catch {
    return null;
  }
}

@Injectable()
export class ContentStudioService {
  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly brandProfilesService: BrandProfilesService,
    private readonly creditsService: CreditsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generate(dto: StudioGenerateDto, user: AuthenticatedUser): Promise<StudioGenerateResult> {
    const brand = await this.loadBrandProfile(user.workspaceId);
    const provider = this.providerFactory.getProvider(dto.provider);

    // Reserve before the paid call and refund if it fails, so a failed
    // generation never costs credits - same contract as image generation.
    const canCharge = Boolean(user.organizationId && user.workspaceId);
    const cost = CREDIT_COST.TEXT_PER_GENERATION;
    if (canCharge) {
      await this.creditsService.reserve({
        organizationId: user.organizationId!,
        workspaceId: user.workspaceId!,
        amount: cost,
        reason: CreditTransactionReason.GENERATION_TEXT,
        userId: user.id,
      });
    }

    let text: string;
    let model: string;
    try {
      const result = await provider.generateText({
        systemPrompt: this.buildSystemPrompt(dto, brand),
        prompt: this.buildUserPrompt(dto),
        maxTokens: 2500,
        temperature: 0.7,
      });
      text = result.text;
      model = result.model;
    } catch (err) {
      if (canCharge) {
        await this.creditsService.refund({
          organizationId: user.organizationId!,
          workspaceId: user.workspaceId!,
          amount: cost,
          userId: user.id,
        });
      }
      throw err;
    }

    this.eventEmitter.emit('ai.content-generated', new AIContentGeneratedEvent(provider.name, model, user.id));

    const parsed = parseModelJson(text);
    if (!parsed && !text.trim()) {
      throw new BadGatewayException('The AI provider returned an empty response. Please try again.');
    }

    const headline = asString(parsed?.headline);
    // If the model ignored the JSON contract, surface its raw text as the body
    // rather than dropping it.
    const body = parsed ? asString(parsed.body) : text.trim();
    const cta = asString(parsed?.cta);
    const hashtags = asStringArray(parsed?.hashtags);

    const regulated = this.isRegulated(brand);
    const flags = regulated ? scanForComplianceIssues([headline, body, cta, hashtags.join(' ')].join('\n')) : [];

    return {
      headline,
      body,
      hashtags,
      cta,
      visualPrompt: asString(parsed?.visualPrompt),
      suggestedPlatforms: asStringArray(parsed?.suggestedPlatforms),
      footer: dto.includeAdvisorDetails === false ? '' : this.buildFooter(brand, regulated),
      compliance: { regulated, flags },
      provider: provider.name,
      model,
    };
  }

  private async loadBrandProfile(workspaceId: string | null): Promise<BrandProfile | null> {
    if (!workspaceId) return null;
    const profiles = await this.brandProfilesService.findByWorkspace(workspaceId);
    return profiles[0] ?? null;
  }

  private isRegulated(brand: BrandProfile | null): boolean {
    if (!brand) return false;
    return /insur/i.test(brand.industry ?? '') || /compliance rules/i.test(brand.guidelines ?? '');
  }

  private buildFooter(brand: BrandProfile | null, regulated: boolean): string {
    const lines: string[] = [];
    const advisor = brand?.advisorProfile;
    if (advisor) {
      lines.push(
        `${advisor.name} | ${advisor.phone} | ${advisor.city} | Licence/Agent No. ${advisor.licenceNumber}`,
      );
    }
    if (regulated) lines.push(INSURANCE_DISCLAIMER);
    return lines.join('\n');
  }

  private buildSystemPrompt(dto: StudioGenerateDto, brand: BrandProfile | null): string {
    const format = CONTENT_FORMATS[dto.format];
    const parts: string[] = [
      'You are the content engine of Lumora, writing on behalf of the brand described below. Follow the brand voice and every rule in the guidelines exactly.',
    ];

    if (brand) {
      const brandLines = [
        `Brand: ${brand.name}`,
        brand.tagline && `Tagline: ${brand.tagline}`,
        brand.industry && `Industry: ${brand.industry}`,
        brand.toneOfVoice?.length && `Tone of voice: ${brand.toneOfVoice.join(', ')}`,
        brand.productsAndServices?.length && `Product categories: ${brand.productsAndServices.join(', ')}`,
        brand.mission && `Mission: ${brand.mission}`,
        brand.primaryCTA && `Preferred call-to-action style: ${brand.primaryCTA}`,
        brand.keywords?.length && `Keywords: ${brand.keywords.join(', ')}`,
      ].filter(Boolean);
      parts.push(`BRAND\n${brandLines.join('\n')}`);
      if (brand.guidelines) {
        parts.push(`BRAND GUIDELINES AND COMPLIANCE RULES (mandatory)\n${brand.guidelines}`);
      }
    }

    parts.push(
      `FORMAT: ${format.label}\n${format.instructions}`,
      `LANGUAGE: ${LANGUAGE_INSTRUCTIONS[dto.language ?? 'english']}`,
      'FACT DISCIPLINE: Use only facts, product names and figures that appear in the brief below. Never invent product names, premiums, benefits, returns or statistics. If a specific figure or product detail would help but was not provided, write a clearly marked placeholder like [VERIFY: premium amount] instead of guessing. Do not include the advisor name, phone number or disclaimer - they are added separately.',
      `OUTPUT: Respond with ONLY a valid JSON object, no markdown fences, with exactly these keys: "headline" (string), "body" (string), "hashtags" (array of 4-6 strings, each starting with #), "cta" (string), "visualPrompt" (string), "suggestedPlatforms" (array of strings). Use \\n inside strings for line breaks.`,
    );

    return parts.join('\n\n');
  }

  private buildUserPrompt(dto: StudioGenerateDto): string {
    const lines = [
      `Topic: ${dto.topic}`,
      dto.goal && `Goal: ${dto.goal}`,
      dto.audience && `Audience: ${dto.audience}`,
      dto.customPrompt && `Additional brief / verified facts:\n${dto.customPrompt}`,
    ].filter(Boolean);
    return lines.join('\n');
  }
}
