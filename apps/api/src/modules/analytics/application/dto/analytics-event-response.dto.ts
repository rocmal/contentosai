import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsEvent } from '../../domain/entities/analytics-event.entity';

export class AnalyticsEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() eventName: string;
  @ApiProperty({ nullable: true }) entityType: string | null;
  @ApiProperty({ nullable: true }) entityId: string | null;
  @ApiProperty({ type: Object, nullable: true }) metadata: Record<string, unknown> | null;
  @ApiProperty() occurredAt: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(analyticsEvent: AnalyticsEvent) {
    this.id = analyticsEvent.id;
    this.organizationId = analyticsEvent.organizationId;
    this.workspaceId = analyticsEvent.workspaceId;
    this.eventName = analyticsEvent.eventName;
    this.entityType = analyticsEvent.entityType;
    this.entityId = analyticsEvent.entityId;
    this.metadata = analyticsEvent.metadata;
    this.occurredAt = analyticsEvent.occurredAt;
    this.createdAt = analyticsEvent.createdAt;
    this.updatedAt = analyticsEvent.updatedAt;
  }
}
