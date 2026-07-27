import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'Create Campaign' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'campaigns.create' })
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, {
    message: 'slug must be dot-namespaced, e.g. "campaigns.create"',
  })
  slug!: string;

  @ApiProperty({ example: 'campaigns' })
  @IsString()
  @MaxLength(100)
  module!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
