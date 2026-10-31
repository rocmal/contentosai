import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import {
  assertInWorkspace,
  ownedBy,
  tenantScope,
  workspaceFilters,
} from '@shared/security/tenant-scope';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { BrandProfilesService } from '../application/services/brand-profiles.service';
import { CreateBrandProfileDto } from '../application/dto/create-brand-profile.dto';
import { UpdateBrandProfileDto } from '../application/dto/update-brand-profile.dto';
import { BrandProfileResponseDto } from '../application/dto/brand-profile-response.dto';

@ApiTags('brand')
@ApiBearerAuth('access-token')
@Controller({ path: 'brand-profiles', version: '1' })
export class BrandProfilesController {
  constructor(private readonly brandProfilesService: BrandProfilesService) {}

  @Post()
  @RequirePermissions('brand.create')
  @ApiOperation({ summary: 'Create a brand profile' })
  async create(
    @Body() dto: CreateBrandProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandProfileResponseDto> {
    const brandProfile = await this.brandProfilesService.create(
      ownedBy(dto, tenantScope(user)),
      user.id,
    );
    return new BrandProfileResponseDto(brandProfile);
  }

  @Get()
  @RequirePermissions('brand.read')
  @ApiOperation({ summary: 'List brand profiles' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.brandProfilesService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: workspaceFilters(tenantScope(user)),
    });
    return {
      items: result.items.map((brandProfile) => new BrandProfileResponseDto(brandProfile)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('brand.read')
  @ApiOperation({ summary: 'Get a brand profile by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandProfileResponseDto> {
    const brandProfile = assertInWorkspace(
      await this.brandProfilesService.findById(id),
      tenantScope(user),
      'Brand profile',
    );
    return new BrandProfileResponseDto(brandProfile);
  }

  @Patch(':id')
  @RequirePermissions('brand.update')
  @ApiOperation({ summary: 'Update a brand profile' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateBrandProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandProfileResponseDto> {
    assertInWorkspace(
      await this.brandProfilesService.findById(id),
      tenantScope(user),
      'Brand profile',
    );
    const brandProfile = await this.brandProfilesService.update(id, dto, user.id);
    return new BrandProfileResponseDto(brandProfile);
  }

  @Delete(':id')
  @RequirePermissions('brand.delete')
  @ApiOperation({ summary: 'Delete a brand profile' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    assertInWorkspace(
      await this.brandProfilesService.findById(id),
      tenantScope(user),
      'Brand profile',
    );
    await this.brandProfilesService.remove(id, user.id);
    return { deleted: true };
  }
}
