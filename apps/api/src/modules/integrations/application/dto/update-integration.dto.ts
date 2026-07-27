import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateIntegrationDto } from './create-integration.dto';

export class UpdateIntegrationDto extends PartialType(
  OmitType(CreateIntegrationDto, ['organizationId', 'workspaceId'] as const),
) {}
