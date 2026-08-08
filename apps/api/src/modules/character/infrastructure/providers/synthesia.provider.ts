import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
  ICharacterProvider,
} from '../../domain/interfaces/character-provider.interface';

interface SynthesiaErrorResponse {
  message?: string;
}

interface SynthesiaCreateResponse extends SynthesiaErrorResponse {
  id?: string;
}

interface SynthesiaStatusResponse extends SynthesiaErrorResponse {
  status?: 'in_progress' | 'complete' | 'failed' | 'rejected';
  download?: string;
}

const SYNTHESIA_API_BASE = 'https://api.synthesia.io/v2';

/**
 * Deliberately does NOT behave like D-ID/HeyGen/SadTalker: Synthesia's
 * product is a curated library of pre-built avatars (or ones you've had
 * onboarded through their team) driven by a script, not "animate whatever
 * photo I just uploaded." Rather than silently discard the user's photo and
 * pretend it worked, submitJob() refuses to run without a configured
 * SYNTHESIA_AVATAR_ID, with a message that says exactly why.
 */
@Injectable()
export class SynthesiaProvider implements ICharacterProvider {
  readonly name = 'synthesia';

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('ai.character.synthesia.apiKey') ?? '';
  }

  private get avatarId(): string {
    return this.configService.get<string>('ai.character.synthesia.avatarId') ?? '';
  }

  async submitJob(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Synthesia character video generation is not configured');
    }
    if (!this.avatarId) {
      throw new ServiceUnavailableException(
        "Synthesia doesn't animate an arbitrary uploaded photo - it uses a pre-built avatar from your " +
          'Synthesia account. Set SYNTHESIA_AVATAR_ID to one of your avatar ids (from the Synthesia ' +
          'dashboard) to use this provider; your uploaded photo will be ignored.',
      );
    }

    const response = await fetch(`${SYNTHESIA_API_BASE}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.apiKey },
      body: JSON.stringify({
        // Safety default: Synthesia's "test" videos are watermarked and
        // don't consume paid render credits. Flip via SYNTHESIA_TEST_MODE=false
        // once you're intentionally generating real output.
        test: this.configService.get<string>('ai.character.synthesia.testMode') !== 'false',
        title: 'Lumora Character Video',
        input: [{ scriptText: request.script, avatar: this.avatarId, background: 'green_screen' }],
      }),
    });

    const body = (await response.json()) as SynthesiaCreateResponse;
    if (!response.ok || !body.id) {
      throw new ServiceUnavailableException(`Synthesia request failed (${response.status}): ${body.message ?? response.statusText}`);
    }

    return { provider: this.name, jobId: body.id, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<CharacterGenerationResult> {
    const response = await fetch(`${SYNTHESIA_API_BASE}/videos/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: this.apiKey },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Synthesia status check failed (${response.status})`);
    }

    const body = (await response.json()) as SynthesiaStatusResponse;
    if (body.status === 'failed' || body.status === 'rejected') {
      return { provider: this.name, jobId, status: 'failed' };
    }

    return {
      provider: this.name,
      jobId,
      status: body.status === 'complete' ? 'completed' : 'processing',
      videoUrl: body.download,
    };
  }
}
