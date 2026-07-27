import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AutomationWorkflowModel } from './infrastructure/persistence/automation-workflow.model';
import { AutomationWorkflowsRepository } from './infrastructure/persistence/automation-workflows.repository';
import { AUTOMATION_WORKFLOWS_REPOSITORY } from './domain/repositories/automation-workflow-repository.interface';
import { AutomationWorkflowsService } from './application/services/automation-workflows.service';
import { AutomationWorkflowsController } from './presentation/automation-workflows.controller';

@Module({
  imports: [SequelizeModule.forFeature([AutomationWorkflowModel])],
  controllers: [AutomationWorkflowsController],
  providers: [
    AutomationWorkflowsService,
    { provide: AUTOMATION_WORKFLOWS_REPOSITORY, useClass: AutomationWorkflowsRepository },
  ],
  exports: [AutomationWorkflowsService, AUTOMATION_WORKFLOWS_REPOSITORY],
})
export class AutomationModule {}
