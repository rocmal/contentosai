import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { StorageService } from '@modules/storage/application/services/storage.service';
import {
  MediaAssetsService,
  MAX_GALLERY_MEDIA_PER_USER,
} from '../application/services/media-assets.service';
import { MediaAssetType } from '../domain/entities/media-asset.entity';
import { CreateMediaAssetDto } from '../application/dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from '../application/dto/update-media-asset.dto';
import {
  MediaAssetResponseDto,
  MediaLibraryItemDto,
} from '../application/dto/media-asset-response.dto';
import { FindMediaLibraryQueryDto } from '../application/dto/find-media-library-query.dto';
import { RenameMediaAssetDto } from '../application/dto/rename-media-asset.dto';
import { UploadMediaMetaDto } from '../application/dto/upload-media-meta.dto';
import { FindMyGalleryQueryDto } from '../application/dto/find-my-gallery-query.dto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

@ApiTags('media')
@ApiBearerAuth('access-token')
@Controller({ path: 'media', version: '1' })
export class MediaAssetsController {
  constructor(
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @RequirePermissions('media.create')
  @ApiOperation({ summary: 'Create a media asset' })
  async create(
    @Body() dto: CreateMediaAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException('An active organization and workspace are required');
    }
    // Always the caller's own workspace, whatever the request body says.
    const mediaAsset = await this.mediaAssetsService.create(
      { ...dto, organizationId: user.organizationId, workspaceId: user.workspaceId },
      user.id,
    );
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Get()
  @RequirePermissions('media.read')
  @ApiOperation({ summary: "List the workspace's media assets (team gallery)" })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindMediaLibraryQueryDto) {
    const result = await this.mediaAssetsService.listLibrary(user, { ...query, scope: 'team' });
    return {
      items: result.items.map((item) => new MediaLibraryItemDto(item)),
      meta: result.meta,
    };
  }

  @Get('library')
  @RequirePermissions('media.read')
  @ApiOperation({
    summary:
      "The gallery manager: your own or the whole team's media, searchable, with who made each item",
  })
  async library(@CurrentUser() user: AuthenticatedUser, @Query() query: FindMediaLibraryQueryDto) {
    const result = await this.mediaAssetsService.listLibrary(user, query);
    return {
      items: result.items.map((item) => new MediaLibraryItemDto(item)),
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

  @Get('gallery-usage')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: "The current user's image/video gallery count against the shared cap" })
  async getGalleryUsage(
    @CurrentUser('id') userId: string,
  ): Promise<{ count: number; max: number }> {
    const count = await this.mediaAssetsService.countGalleryMedia(userId);
    return { count, max: MAX_GALLERY_MEDIA_PER_USER };
  }

  @Post('upload')
  @RequirePermissions('media.create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image or video clip directly into the gallery' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadToGallery(
    @UploadedFile(
      new ParseFilePipeBuilder().addMaxSizeValidator({ maxSize: MAX_UPLOAD_BYTES }).build(),
    )
    file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body() meta: UploadMediaMetaDto,
  ): Promise<MediaAssetResponseDto> {
    if (!user.organizationId || !user.workspaceId) {
      throw new BadRequestException(
        'An active organization and workspace are required to upload to your gallery',
      );
    }
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only images and video clips can be added to the gallery');
    }

    const type = file.mimetype.startsWith('image/') ? MediaAssetType.IMAGE : MediaAssetType.VIDEO;
    const stored = await this.storageService.uploadFile(file, 'gallery');
    const mediaAsset = await this.mediaAssetsService.saveGenerated(
      {
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        fileName: file.originalname,
        storageKey: stored.key,
        url: stored.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        type,
        prompt: meta.prompt?.trim() || null,
        provider: meta.provider ?? null,
        model: meta.model ?? null,
        voiceId: null,
        cacheKeyHash: null,
      },
      user.id,
    );
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Get(':id')
  @RequirePermissions('media.read')
  @ApiOperation({ summary: 'Get a media asset by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    const mediaAsset = await this.mediaAssetsService.findForActor(id, user);
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Patch(':id')
  @RequirePermissions('media.update')
  @ApiOperation({ summary: 'Update a media asset' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateMediaAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    const mediaAsset = await this.mediaAssetsService.update(id, dto, user);
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Patch(':id/rename')
  @RequirePermissions('media.update')
  @ApiOperation({
    summary:
      'Rename one of your gallery items (workspace admins can rename any in their workspace)',
  })
  async rename(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: RenameMediaAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    const mediaAsset = await this.mediaAssetsService.rename(id, dto.fileName, user);
    return new MediaAssetResponseDto(mediaAsset);
  }

  @Delete(':id')
  @RequirePermissions('media.delete')
  @ApiOperation({ summary: 'Delete a media asset' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    await this.mediaAssetsService.remove(id, user);
    return { deleted: true };
  }
}
