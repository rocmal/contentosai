import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'slack' })
  @IsString()
  @MaxLength(100)
  provider!: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Raw provider credentials - encrypted at rest before persisting, never stored or returned as plain text',
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;
}
