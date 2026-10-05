import { Logger } from '@nestjs/common';
import {
  AIGenerationRequest,
  AIGenerationResult,
  IAIProvider,
} from '../domain/interfaces/ai-provider.interface';

/**
 * Tries the primary provider and, if it fails (slow, down, empty answer), asks
 * the backup instead - so a Sarvam hiccup does not cost a Hindi customer their
 * generation. If the backup fails too, the primary's error is what the caller
 * sees. The vendor-specific `model` is dropped for the backup (it would not
 * exist there).
 */
export class FallbackAIProvider implements IAIProvider {
  private readonly logger = new Logger(FallbackAIProvider.name);
  private lastUsed: IAIProvider;

  constructor(
    private readonly primary: IAIProvider,
    private readonly backup: IAIProvider,
  ) {
    this.lastUsed = primary;
  }

  /** Name of whichever provider actually answered the last call. */
  get name(): string {
    return this.lastUsed.name;
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    this.lastUsed = this.primary;
    try {
      return await this.primary.generateText(request);
    } catch (primaryError) {
      this.logger.warn(
        `${this.primary.name} failed (${(primaryError as Error).message.slice(0, 160)}); trying ${this.backup.name}`,
      );
      try {
        this.lastUsed = this.backup;
        return await this.backup.generateText({ ...request, model: undefined });
      } catch {
        this.lastUsed = this.primary;
        throw primaryError;
      }
    }
  }

  healthCheck(): Promise<boolean> {
    return this.primary.healthCheck();
  }
}
