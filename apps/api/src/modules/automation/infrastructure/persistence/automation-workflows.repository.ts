import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { AutomationWorkflow } from '../../domain/entities/automation-workflow.entity';
import {
  CreateAutomationWorkflowData,
  IAutomationWorkflowsRepository,
  UpdateAutomationWorkflowData,
} from '../../domain/repositories/automation-workflow-repository.interface';
import { AutomationWorkflowModel } from './automation-workflow.model';

@Injectable()
export class AutomationWorkflowsRepository
  extends BaseRepository<
    AutomationWorkflowModel,
    AutomationWorkflow,
    CreateAutomationWorkflowData,
    UpdateAutomationWorkflowData
  >
  implements IAutomationWorkflowsRepository
{
  constructor(@InjectModel(AutomationWorkflowModel) model: typeof AutomationWorkflowModel) {
    super(model);
  }

  protected toEntity(instance: AutomationWorkflowModel): AutomationWorkflow {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      name: plain.name,
      trigger: plain.trigger,
      status: plain.status,
      config: plain.config,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
