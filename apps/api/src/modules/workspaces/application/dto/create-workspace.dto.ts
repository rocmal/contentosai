import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty({ example: 'Marketing' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'marketing' })
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug must be lowercase, kebab-case' })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
