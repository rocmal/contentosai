import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { CampaignsService } from '../application/services/campaigns.service';
import { CreateCampaignDto } from '../application/dto/create-campaign.dto';
import { UpdateCampaignDto } from '../application/dto/update-campaign.dto';
import { CampaignResponseDto } from '../application/dto/campaign-response.dto';

@ApiTags('campaigns')
@ApiBearerAuth('access-token')
@Controller({ path: 'campaigns', version: '1' })
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @RequirePermissions('campaigns.create')
  @ApiOperation({ summary: 'Create a campaign' })
  async create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser('id') userId: string,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.campaignsService.create(dto, userId);
    return new CampaignResponseDto(campaign);
  }

  @Get()
  @RequirePermissions('campaigns.read')
  @ApiOperation({ summary: 'List campaigns' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.campaignsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((campaign) => new CampaignResponseDto(campaign)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('campaigns.read')
  @ApiOperation({ summary: 'Get a campaign by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<CampaignResponseDto> {
    const campaign = await this.campaignsService.findById(id);
    return new CampaignResponseDto(campaign);
  }

  @Patch(':id')
  @RequirePermissions('campaigns.update')
  @ApiOperation({ summary: 'Update a campaign' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser('id') userId: string,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.campaignsService.update(id, dto, userId);
    return new CampaignResponseDto(campaign);
  }

  @Delete(':id')
  @RequirePermissions('campaigns.delete')
  @ApiOperation({ summary: 'Delete a campaign' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.campaignsService.remove(id, userId);
    return { deleted: true };
  }
}
