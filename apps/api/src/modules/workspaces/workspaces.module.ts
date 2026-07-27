import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkspaceModel } from './infrastructure/persistence/workspace.model';
import { WorkspacesRepository } from './infrastructure/persistence/workspaces.repository';
import { WORKSPACES_REPOSITORY } from './domain/repositories/workspace-repository.interface';
import { WorkspacesService } from './application/services/workspaces.service';
import { WorkspacesController } from './presentation/workspaces.controller';

@Module({
  imports: [SequelizeModule.forFeature([WorkspaceModel])],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    { provide: WORKSPACES_REPOSITORY, useClass: WorkspacesRepository },
  ],
  exports: [WorkspacesService, WORKSPACES_REPOSITORY],
})
export class WorkspacesModule {}
