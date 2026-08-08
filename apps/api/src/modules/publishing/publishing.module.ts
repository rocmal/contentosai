import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PublishingJobModel } from './infrastructure/persistence/publishing-job.model';
import { PublishingJobsRepository } from './infrastructure/persistence/publishing-jobs.repository';
import { PUBLISHING_JOBS_REPOSITORY } from './domain/repositories/publishing-job-repository.interface';
import { FacebookPublisherProvider } from './infrastructure/providers/facebook-publisher.provider';
import { InstagramPublisherProvider } from './infrastructure/providers/instagram-publisher.provider';
import { LinkedInPublisherProvider } from './infrastructure/providers/linkedin-publisher.provider';
import { YouTubePublisherProvider } from './infrastructure/providers/youtube-publisher.provider';
import { SocialPublisherFactory } from './infrastructure/social-publisher.factory';
import { PublishingJobsService } from './application/services/publishing-jobs.service';
import { PublishingJobsController } from './presentation/publishing-jobs.controller';

@Module({
  imports: [SequelizeModule.forFeature([PublishingJobModel])],
  controllers: [PublishingJobsController],
  providers: [
    PublishingJobsService,
    FacebookPublisherProvider,
    InstagramPublisherProvider,
    LinkedInPublisherProvider,
    YouTubePublisherProvider,
    SocialPublisherFactory,
    { provide: PUBLISHING_JOBS_REPOSITORY, useClass: PublishingJobsRepository },
  ],
  exports: [PublishingJobsService, PUBLISHING_JOBS_REPOSITORY, SocialPublisherFactory],
})
export class PublishingModule {}
