import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { MediaAssetType } from '../../domain/entities/media-asset.entity';

export class FindMediaLibraryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['mine', 'team'], default: 'mine' })
  @IsOptional()
  @IsIn(['mine', 'team'])
  scope?: 'mine' | 'team';

  @ApiPropertyOptional({ enum: MediaAssetType })
  @IsOptional()
  @IsEnum(MediaAssetType)
  type?: MediaAssetType;

  @ApiPropertyOptional({ description: 'Only items an AI studio generated - the creation history' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  generatedOnly?: boolean;
}
