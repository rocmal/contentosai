import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PlatformAdminOnly } from '@common/decorators/platform-admin.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { CreditsService } from '../application/services/credits.service';
import { CreditWalletResponseDto } from '../application/dto/credit-wallet-response.dto';
import { CreditTransactionResponseDto } from '../application/dto/credit-transaction-response.dto';
import { AdjustCreditsDto } from '../application/dto/adjust-credits.dto';
import { CreditUsageQueryDto } from '../application/dto/credit-usage-query.dto';

@ApiTags('credits')
@ApiBearerAuth('access-token')
@Controller({ path: 'credits', version: '1' })
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('wallet')
  @RequirePermissions('credits.read')
  @ApiOperation({ summary: "Get the caller's workspace credit balance" })
  async getMyWallet(
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<CreditWalletResponseDto> {
    const wallet = await this.creditsService.getWallet(workspaceId);
    return new CreditWalletResponseDto(wallet);
  }

  @Get('rates')
  @RequirePermissions('credits.read')
  @ApiOperation({
    summary: 'Credit prices for voice and video, so a cost can be shown before generating',
  })
  getRates() {
    return this.creditsService.getRates();
  }

  @Get('usage')
  @RequirePermissions('credits.read')
  @ApiOperation({
    summary: 'Credits spent by the workspace over a recent period, per kind of generation',
  })
  getMyUsage(@CurrentUser('workspaceId') workspaceId: string, @Query() query: CreditUsageQueryDto) {
    return this.creditsService.getUsageSummary(workspaceId, query.days);
  }

  @Get('transactions')
  @RequirePermissions('credits.read')
  @ApiOperation({ summary: "List the caller's workspace credit usage history" })
  async listMyTransactions(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.creditsService.listTransactions(workspaceId, {
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items.map((tx) => new CreditTransactionResponseDto(tx)),
      meta: result.meta,
    };
  }

  /** Lumora staff only: until 2026-10-31 every workspace owner held credits.manage, so anyone could give themselves
   * credits - or take them from any other workspace. */
  @Post('workspaces/:workspaceId/adjust')
  @PlatformAdminOnly()
  @RequirePermissions('credits.manage')
  @ApiOperation({
    summary:
      "Manually adjust a workspace's credit balance (platform admins: support/admin correction)",
  })
  async adjust(
    @Param('workspaceId', ParseUuidParamPipe) workspaceId: string,
    @Body() dto: AdjustCreditsDto,
    @CurrentUser('id') actorId: string,
  ): Promise<CreditWalletResponseDto> {
    const wallet = await this.creditsService.adjust({
      workspaceId,
      amount: dto.amount,
      actorId,
      note: dto.note,
    });
    return new CreditWalletResponseDto(wallet);
  }
}
