import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

// organizationId and isSystem are deliberately NOT client-settable fields:
// RolesController always derives organizationId from the caller's own JWT
// and forces isSystem false for anything created through this DTO, so a
// tenant admin can never claim another organization's id or mark their own
// role as a protected system role (system roles only ever come from seeders).
export class CreateRoleDto {
  @ApiProperty({ example: 'Editor' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'editor' })
  @IsString()
  @MaxLength(150)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Permission slugs granted to this role' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionSlugs?: string[];
}
