import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { VideoTemplateModel } from './infrastructure/persistence/video-template.model';
import { VideoTemplatesRepository } from './infrastructure/persistence/video-templates.repository';
import { VIDEO_TEMPLATES_REPOSITORY } from './domain/repositories/video-template-repository.interface';
import { VideoTemplatesService } from './application/services/video-templates.service';
import { VideoTemplatesController } from './presentation/video-templates.controller';

@Module({
  imports: [SequelizeModule.forFeature([VideoTemplateModel])],
  controllers: [VideoTemplatesController],
  providers: [
    VideoTemplatesService,
    { provide: VIDEO_TEMPLATES_REPOSITORY, useClass: VideoTemplatesRepository },
  ],
  exports: [VideoTemplatesService, VIDEO_TEMPLATES_REPOSITORY],
})
export class VideoTemplatesModule {}
