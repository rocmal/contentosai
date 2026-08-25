import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { VideoCreditsService } from '../application/services/credits.service';
import { QuoteGenerationDto } from '../application/dto/quote-generation.dto';
import { QuoteResponseDto } from '../application/dto/quote-response.dto';
import { WalletResponseDto } from '../application/dto/wallet-response.dto';

@ApiTags('video-credits')
@ApiBearerAuth('access-token')
@Controller({ path: 'video-credits', version: '1' })
export class VideoCreditsController {
  constructor(private readonly creditsService: VideoCreditsService) {}

  @Get('wallet/:organizationId')
  @RequirePermissions('video-credits.read')
  @ApiOperation({ summary: 'Current credit balance for an organization' })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  async wallet(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
  ): Promise<WalletResponseDto> {
    return new WalletResponseDto(await this.creditsService.getWallet(organizationId));
  }

  @Post('quote')
  @RequirePermissions('video-credits.read')
  @ApiOperation({
    summary: 'Price a generation before running it',
    description:
      'Non-binding. Returns published tier credits only; the model chosen to serve the tier is an implementation detail and is not disclosed.',
  })
  @ApiResponse({ status: 200, type: QuoteResponseDto })
  @ApiResponse({ status: 404, description: 'No published price for this tier and mode' })
  async quote(
    @Body() dto: QuoteGenerationDto,
    @CurrentUser('id') _userId: string,
  ): Promise<QuoteResponseDto> {
    const decision = await this.creditsService.quote({
      organizationId: dto.organizationId,
      tier: dto.tier,
      mode: dto.mode,
      style: dto.style,
      quantity: dto.quantity,
      requiresNativeAudio: dto.requiresNativeAudio,
    });
    return new QuoteResponseDto(decision);
  }
}
