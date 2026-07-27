import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';

export class CreateBrandProfileDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  industry?: string;

  @ApiPropertyOptional({ example: 'Friendly and confident' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  toneOfVoice?: string;

  @ApiPropertyOptional({ type: [String], description: 'Hex color codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brandColors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guidelines?: string;
}
