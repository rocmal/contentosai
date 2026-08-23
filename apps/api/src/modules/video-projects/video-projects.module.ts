import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { VideoProjectModel } from './infrastructure/persistence/video-project.model';
import { VideoProjectsRepository } from './infrastructure/persistence/video-projects.repository';
import { VIDEO_PROJECTS_REPOSITORY } from './domain/repositories/video-project-repository.interface';
import { VideoProjectsService } from './application/services/video-projects.service';
import { VideoProjectsController } from './presentation/video-projects.controller';

@Module({
  imports: [SequelizeModule.forFeature([VideoProjectModel])],
  controllers: [VideoProjectsController],
  providers: [
    VideoProjectsService,
    { provide: VIDEO_PROJECTS_REPOSITORY, useClass: VideoProjectsRepository },
  ],
  exports: [VideoProjectsService, VIDEO_PROJECTS_REPOSITORY],
})
export class VideoProjectsModule {}
