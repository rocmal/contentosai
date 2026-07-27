import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CreatePublishingJobDto } from './create-publishing-job.dto';
import { PublishingJobStatus } from '../../domain/entities/publishing-job.entity';

export class UpdatePublishingJobDto extends PartialType(
  OmitType(CreatePublishingJobDto, ['organizationId', 'workspaceId'] as const),
) {
  @ApiPropertyOptional({ enum: PublishingJobStatus })
  @IsOptional()
  @IsEnum(PublishingJobStatus)
  status?: PublishingJobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
