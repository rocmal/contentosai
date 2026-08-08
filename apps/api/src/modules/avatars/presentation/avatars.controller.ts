import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { AvatarsService } from '../application/services/avatars.service';
import { AvatarResponseDto } from '../application/dto/avatar-response.dto';
import { CreateAvatarDto } from '../application/dto/create-avatar.dto';
import { FindAvatarsQueryDto } from '../application/dto/find-avatars-query.dto';
import { RecordAvatarUsageDto } from '../application/dto/record-avatar-usage.dto';
import { UpdateAvatarDto } from '../application/dto/update-avatar.dto';

@ApiTags('avatars')
@ApiBearerAuth('access-token')
@Controller({ path: 'avatars', version: '1' })
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Get()
  @RequirePermissions('avatars.read')
  @ApiOperation({ summary: 'List reusable avatars for the current workspace' })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FindAvatarsQueryDto) {
    if (!user.workspaceId) {
      return { items: [], meta: this.emptyMeta(query) };
    }
    const result = await this.avatarsService.findAll(query, user.workspaceId);
    return { items: result.items.map((avatar) => new AvatarResponseDto(avatar)), meta: result.meta };
  }

  @Get('search')
  @RequirePermissions('avatars.read')
  @ApiOperation({ summary: 'Search reusable avatars' })
  async search(@CurrentUser() user: AuthenticatedUser, @Query() query: FindAvatarsQueryDto) {
    if (!user.workspaceId) {
      return { items: [], meta: this.emptyMeta(query) };
    }
    const result = await this.avatarsService.findAll(query, user.workspaceId);
    return { items: result.items.map((avatar) => new AvatarResponseDto(avatar)), meta: result.meta };
  }

  private emptyMeta(query: FindAvatarsQueryDto) {
    return {
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: query.limit ?? 20,
      totalPages: 0,
      currentPage: query.page ?? 1,
    };
  }

  @Get('categories')
  @RequirePermissions('avatars.read')
  @ApiOperation({ summary: 'List avatar categories in the current workspace' })
  async categories(@CurrentUser() user: AuthenticatedUser): Promise<{ categories: string[] }> {
    return { categories: user.workspaceId ? await this.avatarsService.findCategories(user.workspaceId) : [] };
  }

  @Get('providers')
  @RequirePermissions('avatars.read')
  @ApiOperation({ summary: 'List avatar providers' })
  providers(): { providers: string[] } {
    return { providers: this.avatarsService.listProviders() };
  }

  @Get(':id')
  @RequirePermissions('avatars.read')
  @ApiOperation({ summary: 'Get a reusable avatar by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.findById(id));
  }

  @Post()
  @RequirePermissions('avatars.create')
  @ApiOperation({ summary: 'Create a reusable avatar' })
  async create(@Body() dto: CreateAvatarDto, @CurrentUser('id') userId: string): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.create(dto, userId));
  }

  @Patch(':id')
  @RequirePermissions('avatars.update')
  @ApiOperation({ summary: 'Update a reusable avatar' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateAvatarDto,
    @CurrentUser('id') userId: string,
  ): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.update(id, dto, userId));
  }

  @Delete(':id')
  @RequirePermissions('avatars.delete')
  @ApiOperation({ summary: 'Delete a reusable avatar' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.avatarsService.remove(id, userId);
    return { deleted: true };
  }

  @Post(':id/duplicate')
  @RequirePermissions('avatars.create')
  @ApiOperation({ summary: 'Duplicate a reusable avatar' })
  async duplicate(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.duplicate(id, userId));
  }

  @Post(':id/favorite')
  @RequirePermissions('avatars.update')
  @ApiOperation({ summary: 'Mark an avatar as a favorite' })
  async favorite(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.setFavorite(id, true, userId));
  }

  @Post(':id/unfavorite')
  @RequirePermissions('avatars.update')
  @ApiOperation({ summary: 'Remove an avatar from favorites' })
  async unfavorite(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.setFavorite(id, false, userId));
  }

  @Post(':id/archive')
  @RequirePermissions('avatars.update')
  @ApiOperation({ summary: 'Archive an avatar' })
  async archive(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<AvatarResponseDto> {
    return new AvatarResponseDto(await this.avatarsService.archive(id, true, userId));
  }

  @Post(':id/use')
  @RequirePermissions('avatars.read')
  @ApiOperation({ summary: 'Record avatar usage' })
  async use(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: RecordAvatarUsageDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ used: boolean }> {
    await this.avatarsService.recordUsage(id, dto, userId);
    return { used: true };
  }
}
