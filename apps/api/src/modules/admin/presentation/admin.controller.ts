import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { PlatformAdminOnly } from '@common/decorators/platform-admin.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { AdminService } from '../application/services/admin.service';
import {
  AdminAdjustCreditsDto,
  AdminCreateCustomerDto,
  AdminGivePlanDto,
  AdminReasonDto,
  RecentActivityQueryDto,
  SearchCustomersQueryDto,
} from '../application/dto/admin.dto';

/**
 * The Admin page: Lumora's platform admins (PLATFORM_ADMIN_EMAILS) find any customer and help them. The whole
 * controller is platform-admin only (class-level decorator, checked in platform-admin.guard.spec.ts), so a route
 * added here later cannot be left open by mistake. Every change answers with the customer as it is now.
 */
@ApiTags('admin')
@ApiBearerAuth('access-token')
@PlatformAdminOnly()
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('customers')
  @ApiOperation({ summary: 'Find customers by name, email or id (newest first)' })
  searchCustomers(@Query() query: SearchCustomersQueryDto) {
    return this.adminService.searchCustomers({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('customers')
  @ApiOperation({
    summary:
      'Open an account for someone, with a trial or a plan; answers with a link for them to set a password',
  })
  createCustomer(@Body() dto: AdminCreateCustomerDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.adminService.createCustomer(admin, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationName: dto.organizationName,
      plan: dto.plan,
      months: dto.months,
      password: dto.password,
      sendEmail: dto.sendEmail,
      reason: dto.reason,
    });
  }

  @Get('activity')
  @ApiOperation({ summary: 'What the platform admins did lately, across every customer' })
  recentActivity(@Query() query: RecentActivityQueryDto) {
    return this.adminService.recentActivity(query.limit);
  }

  @Get('customers/:organizationId')
  @ApiOperation({ summary: 'One customer: people, workspaces, plan, credit history and activity' })
  getCustomer(@Param('organizationId', ParseUuidParamPipe) organizationId: string) {
    return this.adminService.getCustomer(organizationId);
  }

  @Post('customers/:organizationId/workspaces/:workspaceId/credits')
  @HttpCode(200)
  @ApiOperation({
    summary: "Add or remove credits in one of the customer's workspaces, with a reason",
  })
  adjustCredits(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
    @Param('workspaceId', ParseUuidParamPipe) workspaceId: string,
    @Body() dto: AdminAdjustCreditsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.adjustCredits(
      admin,
      organizationId,
      workspaceId,
      dto.amount,
      dto.reason.trim(),
    );
  }

  @Post('customers/:organizationId/plan')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Give 1-12 months of Starter or Pro without a payment (fresh plan credits every 30 days)',
  })
  givePlan(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
    @Body() dto: AdminGivePlanDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.givePlan(
      admin,
      organizationId,
      dto.plan,
      dto.months,
      dto.reason.trim(),
    );
  }

  @Post('customers/:organizationId/people/:userId/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suspend a person: they are signed out everywhere and cannot sign in' })
  suspend(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
    @Param('userId', ParseUuidParamPipe) userId: string,
    @Body() dto: AdminReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.setSuspended(admin, organizationId, userId, true, dto.reason.trim());
  }

  @Post('customers/:organizationId/people/:userId/reactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Let a suspended person sign in again' })
  reactivate(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
    @Param('userId', ParseUuidParamPipe) userId: string,
    @Body() dto: AdminReasonDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.setSuspended(admin, organizationId, userId, false, dto.reason.trim());
  }

  @Post('customers/:organizationId/people/:userId/password-reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Email the person a password reset link (the same one as "Forgot password")',
  })
  sendPasswordReset(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
    @Param('userId', ParseUuidParamPipe) userId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.sendPasswordReset(admin, organizationId, userId);
  }
}
