import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ProjectModel } from './infrastructure/persistence/project.model';
import { ProjectsRepository } from './infrastructure/persistence/projects.repository';
import { PROJECTS_REPOSITORY } from './domain/repositories/project-repository.interface';
import { ProjectsService } from './application/services/projects.service';
import { ProjectsController } from './presentation/projects.controller';

@Module({
  imports: [SequelizeModule.forFeature([ProjectModel])],
  controllers: [ProjectsController],
  providers: [ProjectsService, { provide: PROJECTS_REPOSITORY, useClass: ProjectsRepository }],
  exports: [ProjectsService, PROJECTS_REPOSITORY],
})
export class ProjectsModule {}
