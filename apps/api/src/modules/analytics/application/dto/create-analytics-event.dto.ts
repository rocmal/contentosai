import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAnalyticsEventDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'content.published' })
  @IsString()
  @MaxLength(150)
  eventName!: string;

  @ApiPropertyOptional({ example: 'content' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Defaults to the current time when omitted' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
