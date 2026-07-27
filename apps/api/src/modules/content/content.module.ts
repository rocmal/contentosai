import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ContentModel } from './infrastructure/persistence/content.model';
import { ContentRepository } from './infrastructure/persistence/content.repository';
import { CONTENT_REPOSITORY } from './domain/repositories/content-repository.interface';
import { ContentService } from './application/services/content.service';
import { ContentController } from './presentation/content.controller';

@Module({
  imports: [SequelizeModule.forFeature([ContentModel])],
  controllers: [ContentController],
  providers: [ContentService, { provide: CONTENT_REPOSITORY, useClass: ContentRepository }],
  exports: [ContentService, CONTENT_REPOSITORY],
})
export class ContentModule {}
