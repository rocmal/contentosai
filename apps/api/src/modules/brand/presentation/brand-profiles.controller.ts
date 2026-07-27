import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
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
    @CurrentUser('id') userId: string,
  ): Promise<BrandProfileResponseDto> {
    const brandProfile = await this.brandProfilesService.create(dto, userId);
    return new BrandProfileResponseDto(brandProfile);
  }

  @Get()
  @RequirePermissions('brand.read')
  @ApiOperation({ summary: 'List brand profiles' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.brandProfilesService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((brandProfile) => new BrandProfileResponseDto(brandProfile)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('brand.read')
  @ApiOperation({ summary: 'Get a brand profile by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<BrandProfileResponseDto> {
    const brandProfile = await this.brandProfilesService.findById(id);
    return new BrandProfileResponseDto(brandProfile);
  }

  @Patch(':id')
  @RequirePermissions('brand.update')
  @ApiOperation({ summary: 'Update a brand profile' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateBrandProfileDto,
    @CurrentUser('id') userId: string,
  ): Promise<BrandProfileResponseDto> {
    const brandProfile = await this.brandProfilesService.update(id, dto, userId);
    return new BrandProfileResponseDto(brandProfile);
  }

  @Delete(':id')
  @RequirePermissions('brand.delete')
  @ApiOperation({ summary: 'Delete a brand profile' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.brandProfilesService.remove(id, userId);
    return { deleted: true };
  }
}
