import { ApiProperty } from '@nestjs/swagger';
import { CalendarEvent } from '../../domain/entities/calendar-event.entity';

export class CalendarEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() startAt: Date;
  @ApiProperty({ nullable: true }) endAt: Date | null;
  @ApiProperty({ nullable: true }) contentId: string | null;
  @ApiProperty({ nullable: true }) campaignId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(calendarEvent: CalendarEvent) {
    this.id = calendarEvent.id;
    this.organizationId = calendarEvent.organizationId;
    this.workspaceId = calendarEvent.workspaceId;
    this.title = calendarEvent.title;
    this.description = calendarEvent.description;
    this.startAt = calendarEvent.startAt;
    this.endAt = calendarEvent.endAt;
    this.contentId = calendarEvent.contentId;
    this.campaignId = calendarEvent.campaignId;
    this.createdAt = calendarEvent.createdAt;
    this.updatedAt = calendarEvent.updatedAt;
  }
}
