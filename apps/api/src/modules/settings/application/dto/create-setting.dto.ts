import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSettingDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty({ example: 'branding.primaryColor' })
  @IsString()
  @MaxLength(150)
  key!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  value?: unknown;
}
