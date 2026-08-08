import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { CREDIT_COST, creditsForDurationSeconds } from '@modules/credits/credits.constants';
import { VideoProviderFactory } from '../../infrastructure/video-provider.factory';
import { VideoGenerationResult } from '../../domain/interfaces/video-provider.interface';
import { GenerateVideoDto } from '../dto/generate-video.dto';

const DEFAULT_DURATION_SECONDS = 5;

export interface SubmitJobActor {
  userId?: string;
  organizationId?: string | null;
  workspaceId?: string | null;
}

@Injectable()
export class VideoService {
  constructor(
    private readonly providerFactory: VideoProviderFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly creditsService: CreditsService,
  ) {}

  /** Video generation is asynchronous vendor-side (see VideoProcessor) - the
   * charge happens here, at submission, not on eventual completion. A
   * synchronous rejection from the provider (bad request, no credentials,
   * etc.) refunds immediately; a job accepted here but that later fails
   * vendor-side keeps its charge, matching how the vendor's own compute
   * cost was already incurred once the job was accepted. */
  async submitJob(dto: GenerateVideoDto, actor: SubmitJobActor = {}): Promise<VideoGenerationResult> {
    const canCharge = Boolean(actor.organizationId && actor.workspaceId);
    const cost = creditsForDurationSeconds(
      dto.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      10 / CREDIT_COST.VIDEO_PER_10_SECONDS,
    );
    if (canCharge) {
      await this.creditsService.reserve({
        organizationId: actor.organizationId!,
        workspaceId: actor.workspaceId!,
        amount: cost,
        reason: CreditTransactionReason.GENERATION_VIDEO,
        userId: actor.userId,
      });
    }

    const provider = this.providerFactory.getProvider(dto.provider);
    let result: VideoGenerationResult;
    try {
      result = await provider.submitJob({
        prompt: dto.prompt,
        model: dto.model,
        imageUrl: dto.imageUrl,
        durationSeconds: dto.durationSeconds,
      });
    } catch (err) {
      if (canCharge) {
        await this.creditsService.refund({
          organizationId: actor.organizationId!,
          workspaceId: actor.workspaceId!,
          amount: cost,
          userId: actor.userId,
        });
      }
      throw err;
    }

    this.eventEmitter.emit('video.job-submitted', {
      provider: result.provider,
      jobId: result.jobId,
      userId: actor.userId,
    });

    return result;
  }

  async getJobStatus(providerName: string, jobId: string): Promise<VideoGenerationResult> {
    const provider = this.providerFactory.getProvider(providerName);
    return provider.getJobStatus(jobId);
  }

  listProviders(): string[] {
    return this.providerFactory.listProviders();
  }
}
