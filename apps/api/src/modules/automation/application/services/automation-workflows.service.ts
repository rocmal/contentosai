import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { AutomationWorkflow } from '../../domain/entities/automation-workflow.entity';
import {
  AUTOMATION_WORKFLOWS_REPOSITORY,
  IAutomationWorkflowsRepository,
} from '../../domain/repositories/automation-workflow-repository.interface';
import { CreateAutomationWorkflowDto } from '../dto/create-automation-workflow.dto';
import { UpdateAutomationWorkflowDto } from '../dto/update-automation-workflow.dto';
import { AutomationWorkflowCreatedEvent } from '../events/automation-workflow-created.event';

@Injectable()
export class AutomationWorkflowsService {
  constructor(
    @Inject(AUTOMATION_WORKFLOWS_REPOSITORY)
    private readonly automationWorkflowsRepository: IAutomationWorkflowsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAutomationWorkflowDto, actorId?: string): Promise<AutomationWorkflow> {
    const automationWorkflow = await this.automationWorkflowsRepository.create(
      {
        organizationId: dto.organizationId,
        workspaceId: dto.workspaceId,
        name: dto.name,
        trigger: dto.trigger,
        config: dto.config ?? null,
      },
      actorId,
    );

    this.eventEmitter.emit(
      'automation.created',
      new AutomationWorkflowCreatedEvent(automationWorkflow.id, automationWorkflow.workspaceId),
    );

    return automationWorkflow;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<AutomationWorkflow>> {
    return this.automationWorkflowsRepository.findAll(options);
  }

  async findById(id: string): Promise<AutomationWorkflow> {
    const automationWorkflow = await this.automationWorkflowsRepository.findById(id);
    if (!automationWorkflow) {
      throw new NotFoundException(`AutomationWorkflow with id "${id}" not found`);
    }
    return automationWorkflow;
  }

  async update(
    id: string,
    dto: UpdateAutomationWorkflowDto,
    actorId?: string,
  ): Promise<AutomationWorkflow> {
    await this.findById(id);
    return this.automationWorkflowsRepository.update(
      id,
      {
        name: dto.name,
        trigger: dto.trigger,
        status: dto.status,
        config: dto.config,
      },
      actorId,
    );
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.automationWorkflowsRepository.delete(id, actorId);
  }
}
