import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAnalyticsEventDto } from './create-analytics-event.dto';

export class UpdateAnalyticsEventDto extends PartialType(
  OmitType(CreateAnalyticsEventDto, ['organizationId', 'workspaceId'] as const),
) {}
