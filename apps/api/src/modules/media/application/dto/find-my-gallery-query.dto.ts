import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { MediaAssetType } from '../../domain/entities/media-asset.entity';

export class FindMyGalleryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MediaAssetType })
  @IsOptional()
  @IsEnum(MediaAssetType)
  type?: MediaAssetType;
}
