import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateOrganizationDto } from './create-organization.dto';
import { OrganizationStatus } from '../../domain/entities/organization.entity';

export class UpdateOrganizationDto extends PartialType(
  OmitType(CreateOrganizationDto, ['slug'] as const),
) {
  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
