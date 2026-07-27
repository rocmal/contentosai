import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBrandProfileDto } from './create-brand-profile.dto';

export class UpdateBrandProfileDto extends PartialType(
  OmitType(CreateBrandProfileDto, ['organizationId', 'workspaceId'] as const),
) {}
