import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVideoTemplateDto } from './create-video-template.dto';

export class UpdateVideoTemplateDto extends PartialType(
  OmitType(CreateVideoTemplateDto, [
    'organizationId',
    'workspaceId',
    'videoUrl',
    'storageKey',
  ] as const),
) {}
