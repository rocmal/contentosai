import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PublishingJobModel } from './infrastructure/persistence/publishing-job.model';
import { PublishingJobsRepository } from './infrastructure/persistence/publishing-jobs.repository';
import { PUBLISHING_JOBS_REPOSITORY } from './domain/repositories/publishing-job-repository.interface';
import { PublishingJobsService } from './application/services/publishing-jobs.service';
import { PublishingJobsController } from './presentation/publishing-jobs.controller';

@Module({
  imports: [SequelizeModule.forFeature([PublishingJobModel])],
  controllers: [PublishingJobsController],
  providers: [
    PublishingJobsService,
    { provide: PUBLISHING_JOBS_REPOSITORY, useClass: PublishingJobsRepository },
  ],
  exports: [PublishingJobsService, PUBLISHING_JOBS_REPOSITORY],
})
export class PublishingModule {}
