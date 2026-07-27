import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAutomationWorkflowDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'Auto-publish approved posts' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'content.approved' })
  @IsString()
  @MaxLength(150)
  trigger!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
