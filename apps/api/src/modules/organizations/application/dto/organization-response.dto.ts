import { ApiProperty } from '@nestjs/swagger';
import { Organization, OrganizationStatus } from '../../domain/entities/organization.entity';

export class OrganizationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() ownerId: string;
  @ApiProperty({ enum: OrganizationStatus }) status: OrganizationStatus;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(organization: Organization) {
    this.id = organization.id;
    this.name = organization.name;
    this.slug = organization.slug;
    this.ownerId = organization.ownerId;
    this.status = organization.status;
    this.description = organization.description;
    this.createdAt = organization.createdAt;
    this.updatedAt = organization.updatedAt;
  }
}
