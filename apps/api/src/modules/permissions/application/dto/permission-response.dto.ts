import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../domain/entities/permission.entity';

export class PermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() module: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(permission: Permission) {
    this.id = permission.id;
    this.name = permission.name;
    this.slug = permission.slug;
    this.module = permission.module;
    this.description = permission.description;
    this.createdAt = permission.createdAt;
    this.updatedAt = permission.updatedAt;
  }
}
