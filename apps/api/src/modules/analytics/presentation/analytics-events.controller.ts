import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AnalyticsEventsService } from '../application/services/analytics-events.service';
import { CreateAnalyticsEventDto } from '../application/dto/create-analytics-event.dto';
import { UpdateAnalyticsEventDto } from '../application/dto/update-analytics-event.dto';
import { AnalyticsEventResponseDto } from '../application/dto/analytics-event-response.dto';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Controller({ path: 'analytics/events', version: '1' })
export class AnalyticsEventsController {
  constructor(private readonly analyticsEventsService: AnalyticsEventsService) {}

  @Post()
  @RequirePermissions('analytics.create')
  @ApiOperation({ summary: 'Create an analytics event' })
  async create(
    @Body() dto: CreateAnalyticsEventDto,
    @CurrentUser('id') userId: string,
  ): Promise<AnalyticsEventResponseDto> {
    const analyticsEvent = await this.analyticsEventsService.create(dto, userId);
    return new AnalyticsEventResponseDto(analyticsEvent);
  }

  @Get()
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'List analytics events' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.analyticsEventsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((analyticsEvent) => new AnalyticsEventResponseDto(analyticsEvent)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'Get an analytics event by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<AnalyticsEventResponseDto> {
    const analyticsEvent = await this.analyticsEventsService.findById(id);
    return new AnalyticsEventResponseDto(analyticsEvent);
  }

  @Patch(':id')
  @RequirePermissions('analytics.update')
  @ApiOperation({ summary: 'Update an analytics event' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateAnalyticsEventDto,
    @CurrentUser('id') userId: string,
  ): Promise<AnalyticsEventResponseDto> {
    const analyticsEvent = await this.analyticsEventsService.update(id, dto, userId);
    return new AnalyticsEventResponseDto(analyticsEvent);
  }

  @Delete(':id')
  @RequirePermissions('analytics.delete')
  @ApiOperation({ summary: 'Delete an analytics event' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.analyticsEventsService.remove(id, userId);
    return { deleted: true };
  }
}
