import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationalVideoCapabilities,
  ConversationalVideoRequest,
  IConversationalVideoProvider,
  RefineOptions,
  ReferenceImage,
  VideoAspectRatio,
  VideoDelivery,
  VideoPayload,
  VideoTurnResult,
  VideoTurnStatus,
} from '../../domain/interfaces/conversational-video.port';

/** Wire shapes for the Interactions API. Deliberately narrow: unknown fields
 *  are ignored rather than typed as `any`. */
interface OmniContentBlock {
  type: string;
  text?: string;
  mime_type?: string;
  data?: string;
  uri?: string;
}

interface OmniStep {
  type: string;
  content?: OmniContentBlock[];
}

interface OmniInteractionResponse {
  id: string;
  status?: string;
  steps?: OmniStep[];
  error?: { message?: string };
}

interface OmniInputPart {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mime_type?: string;
}

interface OmniCreateBody {
  model: string;
  input: string | OmniInputPart[];
  previous_interaction_id?: string;
  response_format: { type: 'video'; aspect_ratio: string; delivery: string };
  generation_config?: { video_config: { task: string } };
  store: boolean;
  background: boolean;
  stream: false;
}

const MODEL_ID = 'gemini-omni-flash-preview';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Adapter for Gemini Omni Flash.
 *
 * Two vendor behaviours are encoded here as hard constraints rather than
 * left to callers:
 *
 *  1. Inline delivery is capped, so anything above the cap must be requested
 *     with URI delivery.
 *  2. Re-fetching an interaction returns inline base64 even when it was
 *     created with URI delivery - the URI is only guaranteed on the creation
 *     response. `start`/`refine` therefore capture the URI immediately and
 *     `getTurn` is treated as a status probe, not a URI source.
 */
@Injectable()
export class GeminiOmniProvider implements IConversationalVideoProvider {
  readonly name = 'gemini-omni';
  private readonly logger = new Logger(GeminiOmniProvider.name);

  constructor(private readonly configService: ConfigService) {}

  capabilities(): ConversationalVideoCapabilities {
    return {
      providerName: this.name,
      modelId: MODEL_ID,
      maxDurationSeconds: 10,
      supportsStatefulEditing: true,
      supportsVideoExtension: false,
      supportsSystemInstructions: false,
      supportsNegativePrompts: false,
      supportsProvisionedThroughput: false,
      maxInlinePayloadBytes: 4 * 1024 * 1024,
      aspectRatios: [VideoAspectRatio.LANDSCAPE, VideoAspectRatio.PORTRAIT],
      uploadEditingBlockedRegions: [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
        'HU', 'IE', 'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL',
        'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'GB',
      ],
    };
  }

  async start(request: ConversationalVideoRequest): Promise<VideoTurnResult> {
    const body: OmniCreateBody = {
      model: MODEL_ID,
      input: this.buildInput(request.prompt, request.referenceImages),
      response_format: {
        type: 'video',
        aspect_ratio: request.aspectRatio,
        delivery: request.delivery === VideoDelivery.URI ? 'uri' : 'inline',
      },
      generation_config: { video_config: { task: request.task } },
      store: request.store,
      background: request.background,
      stream: false,
    };

    const response = await this.post(body);
    return this.toTurnResult(response, null, request.store);
  }

  async refine(
    previousProviderTurnId: string,
    instruction: string,
    options: RefineOptions,
  ): Promise<VideoTurnResult> {
    const body: OmniCreateBody = {
      model: MODEL_ID,
      input: instruction,
      previous_interaction_id: previousProviderTurnId,
      response_format: {
        type: 'video',
        aspect_ratio: options.aspectRatio,
        delivery: options.delivery === VideoDelivery.URI ? 'uri' : 'inline',
      },
      store: options.store,
      background: options.background,
      stream: false,
    };

    const response = await this.post(body);
    return this.toTurnResult(response, previousProviderTurnId, options.store);
  }

  async getTurn(providerTurnId: string): Promise<VideoTurnResult> {
    const response = await this.request(
      `${this.baseUrl}/interactions/${providerTurnId}`,
      { method: 'GET', headers: this.headers() },
    );
    // Status probe only - see the class comment on URI delivery.
    return this.toTurnResult(response, null, true);
  }

  private buildInput(
    prompt: string,
    images: readonly ReferenceImage[],
  ): string | OmniInputPart[] {
    if (images.length === 0) {
      return prompt;
    }
    const parts: OmniInputPart[] = images.map((image) => ({
      type: 'image',
      data: image.data,
      mime_type: image.mimeType,
    }));
    parts.push({ type: 'text', text: prompt });
    return parts;
  }

  private async post(body: OmniCreateBody): Promise<OmniInteractionResponse> {
    return this.request(`${this.baseUrl}/interactions`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request(
    url: string,
    init: RequestInit,
  ): Promise<OmniInteractionResponse> {
    if (this.apiKey.length === 0) {
      throw new ServiceUnavailableException('Gemini Omni is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        this.logger.warn(`Gemini Omni request failed with status ${response.status}`);
        throw new ServiceUnavailableException(
          `Gemini Omni request failed (${response.status})`,
        );
      }
      return (await response.json()) as OmniInteractionResponse;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Gemini Omni request could not be completed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private toTurnResult(
    response: OmniInteractionResponse,
    parentProviderTurnId: string | null,
    stored: boolean,
  ): VideoTurnResult {
    if (response.error) {
      return {
        providerTurnId: response.id,
        parentProviderTurnId,
        status: VideoTurnStatus.FAILED,
        payload: null,
        editable: false,
        failureReason: response.error.message ?? 'Generation failed',
      };
    }

    const status = this.mapStatus(response.status);
    const payload = status === VideoTurnStatus.COMPLETED ? this.extractPayload(response) : null;

    return {
      providerTurnId: response.id,
      parentProviderTurnId,
      status,
      payload,
      editable: stored && status === VideoTurnStatus.COMPLETED,
      failureReason: null,
    };
  }

  private mapStatus(status: string | undefined): VideoTurnStatus {
    if (status === 'completed') {
      return VideoTurnStatus.COMPLETED;
    }
    if (status === 'failed') {
      return VideoTurnStatus.FAILED;
    }
    return VideoTurnStatus.IN_PROGRESS;
  }

  private extractPayload(response: OmniInteractionResponse): VideoPayload | null {
    const steps = response.steps ?? [];
    for (const step of steps) {
      if (step.type !== 'model_output') {
        continue;
      }
      for (const block of step.content ?? []) {
        if (block.type !== 'video') {
          continue;
        }
        const mimeType = block.mime_type ?? 'video/mp4';
        if (typeof block.uri === 'string' && block.uri.length > 0) {
          return { kind: VideoDelivery.URI, uri: block.uri, mimeType };
        }
        if (typeof block.data === 'string' && block.data.length > 0) {
          return { kind: VideoDelivery.INLINE, base64: block.data, mimeType };
        }
      }
    }
    return null;
  }

  private get apiKey(): string {
    return this.configService.get<string>('ai.video.omni.apiKey') ?? '';
  }

  private get baseUrl(): string {
    return this.configService.get<string>('ai.video.omni.baseUrl') ?? DEFAULT_BASE_URL;
  }

  private headers(): Record<string, string> {
    return { 'x-goog-api-key': this.apiKey };
  }
}
