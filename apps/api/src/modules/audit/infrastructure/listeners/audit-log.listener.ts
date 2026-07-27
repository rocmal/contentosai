import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '@modules/users/application/events/user-created.event';
import { OrganizationCreatedEvent } from '@modules/organizations/application/events/organization-created.event';
import { AuditLogService } from '../../application/services/audit-log.service';

/**
 * Bridges in-process domain events into durable audit trail entries. Modules
 * that emit `*.created` events have no dependency on the audit module - it
 * subscribes on its own.
 */
@Injectable()
export class AuditLogListener {
  constructor(private readonly auditLogService: AuditLogService) {}

  @OnEvent('user.created')
  async onUserCreated(event: UserCreatedEvent): Promise<void> {
    await this.auditLogService.record({
      userId: event.userId,
      action: 'user.created',
      entityType: 'User',
      entityId: event.userId,
    });
  }

  @OnEvent('organization.created')
  async onOrganizationCreated(event: OrganizationCreatedEvent): Promise<void> {
    await this.auditLogService.record({
      organizationId: event.organizationId,
      userId: event.ownerId,
      action: 'organization.created',
      entityType: 'Organization',
      entityId: event.organizationId,
    });
  }
}
