import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMediaAssetDto } from './create-media-asset.dto';

export class UpdateMediaAssetDto extends PartialType(
  OmitType(CreateMediaAssetDto, ['organizationId', 'workspaceId'] as const),
) {}
