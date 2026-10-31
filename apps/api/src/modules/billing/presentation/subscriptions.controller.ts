import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PlatformAdminOnly } from '@common/decorators/platform-admin.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import {
  assertInOrganization,
  organizationFilters,
  tenantScope,
} from '@shared/security/tenant-scope';
import { SubscriptionsService } from '../application/services/subscriptions.service';
import { CreateSubscriptionDto } from '../application/dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../application/dto/update-subscription.dto';
import { ListSubscriptionsQueryDto } from '../application/dto/list-subscriptions-query.dto';
import { SubscriptionResponseDto } from '../application/dto/subscription-response.dto';

/** Customers read their own plan; changing one happens only through checkout (Razorpay's webhook) or a Lumora
 * platform admin. Until 2026-10-31 any workspace owner could PATCH their own subscription to an active Enterprise
 * plan, which the renewal job then turned into unlimited credits. */
@ApiTags('billing')
@ApiBearerAuth('access-token')
@Controller({ path: 'billing/subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @PlatformAdminOnly()
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
  @ApiOperation({ summary: 'List subscriptions (pass organizationId to scope to one tenant)' })
  async findAll(@Query() query: ListSubscriptionsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.subscriptionsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: organizationFilters(
        tenantScope(user),
        query.organizationId ? { organizationId: query.organizationId } : {},
      ),
    });
    return {
      items: result.items.map((subscription) => new SubscriptionResponseDto(subscription)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('billing.read')
  @ApiOperation({ summary: 'Get a subscription by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    const subscription = assertInOrganization(
      await this.subscriptionsService.findById(id),
      tenantScope(user),
      'Subscription',
    );
    return new SubscriptionResponseDto(subscription);
  }

  @Patch(':id')
  @PlatformAdminOnly()
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
  @PlatformAdminOnly()
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
