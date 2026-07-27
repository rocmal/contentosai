import { ApiProperty } from '@nestjs/swagger';
import { Integration, IntegrationStatus } from '../../domain/entities/integration.entity';

// Deliberately excludes encryptedCredentials (and any decrypted form of it) - this DTO is the API surface.
export class IntegrationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() provider: string;
  @ApiProperty({ enum: IntegrationStatus }) status: IntegrationStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(integration: Integration) {
    this.id = integration.id;
    this.organizationId = integration.organizationId;
    this.workspaceId = integration.workspaceId;
    this.provider = integration.provider;
    this.status = integration.status;
    this.createdAt = integration.createdAt;
    this.updatedAt = integration.updatedAt;
  }
}
