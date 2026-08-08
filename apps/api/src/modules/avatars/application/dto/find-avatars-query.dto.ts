import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AvatarCategory } from '../../domain/entities/avatar.entity';

export class FindAvatarsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AvatarCategory })
  @IsOptional()
  @IsEnum(AvatarCategory)
  category?: AvatarCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  favorite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  archived?: string;

  @ApiPropertyOptional({ enum: ['all', 'favorites', 'recently_used', 'recently_created'] })
  @IsOptional()
  @IsString()
  filter?: 'all' | 'favorites' | 'recently_used' | 'recently_created';
}
