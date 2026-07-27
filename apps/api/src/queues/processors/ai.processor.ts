import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AiService } from '@modules/ai/application/services/ai.service';
import { GenerateContentDto } from '@modules/ai/application/dto/generate-content.dto';
import { AIGenerationResult } from '@modules/ai/domain/interfaces/ai-provider.interface';
import { QueueName } from '../queue-names';

type GenerateContentJobData = GenerateContentDto & { userId?: string };

/** Backs background/batch content generation - callers that don't need the
 * result inline enqueue a job here instead of calling AiService directly. */
@Processor(QueueName.AI)
export class AiProcessor extends WorkerHost {
  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<GenerateContentJobData>): Promise<AIGenerationResult> {
    const { userId, ...dto } = job.data;
    return this.aiService.generateText(dto, userId);
  }
}
