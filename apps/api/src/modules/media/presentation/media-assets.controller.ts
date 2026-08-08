import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { MediaAssetsService } from '../application/services/media-assets.service';
import { CreateMediaAssetDto } from '../application/dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from '../application/dto/update-media-asset.dto';
import { MediaAssetResponseDto } from '../application/dto/media-asset-response.dto';
import { FindMyGalleryQueryDto } from '../application/dto/find-my-gallery-query.dto';

@ApiTags('media')
@ApiBearerAuth('access-token')
@Controller({ path: 'media', version: '1' })
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post()
  @RequirePermissions('media.create')
  @ApiOperation({ summary: 'Create a media asset' })
  async create(
    @Body() dto: CreateMediaAssetDto,
    @CurrentUser('id') userId: string,
  ): Promise<MediaAssetResponseDto> {
    const mediaAsset = await this.mediaAssetsService.create(dto, userId);
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Get()
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'List media assets' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.mediaAssetsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((mediaAsset) => new MediaAssetResponseDto(mediaAsset)),
      meta: result.meta,
    };
  }

  @Get('my')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: "The current user's own generated/uploaded media - a reusable gallery" })
  async findMyGallery(@CurrentUser('id') userId: string, @Query() query: FindMyGalleryQueryDto) {
    const result = await this.mediaAssetsService.findMyGallery(userId, query.type, {
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items.map((mediaAsset) => new MediaAssetResponseDto(mediaAsset)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Get a media asset by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<MediaAssetResponseDto> {
    const mediaAsset = await this.mediaAssetsService.findById(id);
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Patch(':id')
  @RequirePermissions('media.update')
  @ApiOperation({ summary: 'Update a media asset' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateMediaAssetDto,
    @CurrentUser('id') userId: string,
  ): Promise<MediaAssetResponseDto> {
    const mediaAsset = await this.mediaAssetsService.update(id, dto, userId);
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Delete(':id')
  @RequirePermissions('media.delete')
  @ApiOperation({ summary: 'Delete a media asset' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.mediaAssetsService.remove(id, userId);
    return { deleted: true };
  }
}
