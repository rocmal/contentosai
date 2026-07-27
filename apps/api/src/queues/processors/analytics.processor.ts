import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueName } from '../queue-names';

interface AnalyticsJobData {
  eventName: string;
  payload: Record<string, unknown>;
}

@Processor(QueueName.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  async process(job: Job<AnalyticsJobData>): Promise<void> {
    this.logger.log({ event: job.data.eventName, payload: job.data.payload }, 'analytics.event');
  }
}
