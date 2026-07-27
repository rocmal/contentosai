import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { SubscriptionsService } from '../application/services/subscriptions.service';
import { CreateSubscriptionDto } from '../application/dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../application/dto/update-subscription.dto';
import { SubscriptionResponseDto } from '../application/dto/subscription-response.dto';

@ApiTags('billing')
@ApiBearerAuth('access-token')
@Controller({ path: 'billing/subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @RequirePermissions('billing.create')
  @ApiOperation({ summary: 'Create a subscription' })
  async create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.create(dto, userId);
    return new SubscriptionResponseDto(subscription);
  }

  @Get()
  @RequirePermissions('billing.read')
  @ApiOperation({ summary: 'List subscriptions' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.subscriptionsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((subscription) => new SubscriptionResponseDto(subscription)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('billing.read')
  @ApiOperation({ summary: 'Get a subscription by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.findById(id);
    return new SubscriptionResponseDto(subscription);
  }

  @Patch(':id')
  @RequirePermissions('billing.update')
  @ApiOperation({ summary: 'Update a subscription' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.update(id, dto, userId);
    return new SubscriptionResponseDto(subscription);
  }

  @Delete(':id')
  @RequirePermissions('billing.delete')
  @ApiOperation({ summary: 'Delete a subscription' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.subscriptionsService.remove(id, userId);
    return { deleted: true };
  }
}
