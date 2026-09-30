import { BadGatewayException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { AIProviderFactory } from '../../infrastructure/ai-provider.factory';
import { fetchPublicHtml } from '../../infrastructure/safe-http-fetch';
import { extractPageSignals } from '../content-studio/html-signals';
import { runWithTextCredit } from '../credited-run';

export interface BrandDraft {
  businessName: string;
  industry: string;
  tagline: string;
  mission: string;
  toneOfVoice: string[];
  primaryCTA: string;
  targetAudience: string;
  productsAndServices: string[];
  keywords: string[];
  brandColors: string[];
}

export interface BrandExtraction {
  draft: BrandDraft;
  source: { url: string; title: string };
}

const asString = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const asStrings = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).slice(0, max) : [];

@Injectable()
export class BrandExtractorService {
  constructor(
    private readonly providerFactory: AIProviderFactory,
    private readonly creditsService: CreditsService,
  ) {}

  /** Reads the public website and drafts a Brand Brain from what the page
   * actually says. Nothing here is saved - the caller shows it for review. */
  async extract(websiteUrl: string, user: AuthenticatedUser): Promise<BrandExtraction> {
    const page = await fetchPublicHtml(websiteUrl);
    const signals = extractPageSignals(page.html);
    if (!signals.title && !signals.description && signals.text.length < 80) {
      throw new BadGatewayException(
        'That page has almost no readable text (it may be built entirely with JavaScript). Try another page of the site, such as the About page.',
      );
    }

    const provider = this.providerFactory.getProvider();
    const { text } = await runWithTextCredit(this.creditsService, user, () =>
      provider.generateText({
        systemPrompt:
          'You turn the text of a company web page into a brand profile draft. Use ONLY information present in the page text. If something is not supported by the page, return an empty string or empty array for it - never guess or invent. Respond with ONLY a JSON object, no markdown, with keys: businessName (string), industry (string), tagline (string, only if the page states one), mission (string, one or two sentences in the company\'s own terms), toneOfVoice (array of up to 5 adjectives describing the page\'s writing), primaryCTA (string, the main call-to-action the page uses), targetAudience (string), productsAndServices (array of up to 8 short names), keywords (array of up to 8).',
        prompt: [
          `Page URL: ${page.finalUrl}`,
          `Title: ${signals.title}`,
          signals.siteName && `Site name: ${signals.siteName}`,
          signals.description && `Meta description: ${signals.description}`,
          `Page text:\n${signals.text}`,
        ]
          .filter(Boolean)
          .join('\n'),
        maxTokens: 1200,
        temperature: 0.2,
      }),
    );

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    let parsed: Record<string, unknown> = {};
    try {
      parsed = start !== -1 && end > start ? (JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }
    if (Object.keys(parsed).length === 0) {
      throw new BadGatewayException('Could not read a brand profile from that website. Please try again.');
    }

    return {
      draft: {
        businessName: asString(parsed.businessName),
        industry: asString(parsed.industry),
        tagline: asString(parsed.tagline),
        mission: asString(parsed.mission),
        toneOfVoice: asStrings(parsed.toneOfVoice, 5),
        primaryCTA: asString(parsed.primaryCTA),
        targetAudience: asString(parsed.targetAudience),
        productsAndServices: asStrings(parsed.productsAndServices, 8),
        keywords: asStrings(parsed.keywords, 8),
        // Only a colour the site itself declares - never a model guess.
        brandColors: signals.themeColor ? [signals.themeColor] : [],
      },
      source: { url: page.finalUrl, title: signals.title },
    };
  }
}
