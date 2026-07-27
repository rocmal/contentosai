import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../domain/entities/role.entity';

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) organizationId: string | null;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() isSystem: boolean;
  @ApiProperty({ type: [String] }) permissionSlugs: string[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(role: Role) {
    this.id = role.id;
    this.organizationId = role.organizationId;
    this.name = role.name;
    this.slug = role.slug;
    this.description = role.description;
    this.isSystem = role.isSystem;
    this.permissionSlugs = role.permissionSlugs ?? [];
    this.createdAt = role.createdAt;
    this.updatedAt = role.updatedAt;
  }
}
