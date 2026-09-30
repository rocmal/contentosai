import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { AiService } from '../application/services/ai.service';
import { GenerateContentDto } from '../application/dto/generate-content.dto';
import { ContentStudioService, StudioGenerateResult } from '../application/services/content-studio.service';
import { CopilotService } from '../application/services/copilot.service';
import { BrandExtractorService, BrandExtraction } from '../application/services/brand-extractor.service';
import { CopilotMessageDto } from '../application/dto/copilot.dto';
import { ExtractBrandDto } from '../application/dto/extract-brand.dto';
import { StudioGenerateDto } from '../application/dto/studio-generate.dto';
import { GenerateContentResponseDto } from '../application/dto/generate-content-response.dto';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly contentStudioService: ContentStudioService,
    private readonly copilotService: CopilotService,
    private readonly brandExtractorService: BrandExtractorService,
  ) {}

  @Post('generate')
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'Generate text content with the configured AI provider' })
  async generate(
    @Body() dto: GenerateContentDto,
    @CurrentUser('id') userId: string,
  ): Promise<GenerateContentResponseDto> {
    const result = await this.aiService.generateText(dto, userId);
    return new GenerateContentResponseDto(result);
  }

  @Post('studio/generate')
  @RequirePermissions('ai.generate')
  @ApiOperation({
    summary: 'Generate brand-aware, compliance-checked content (reel, poster, WhatsApp, advisor post, ...)',
  })
  studioGenerate(
    @Body() dto: StudioGenerateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudioGenerateResult> {
    return this.contentStudioService.generate(dto, user);
  }

  @Post('copilot')
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'Co-pilot chat reply, aware of the workspace Brand Brain (1 credit)' })
  copilot(@Body() dto: CopilotMessageDto, @CurrentUser() user: AuthenticatedUser): Promise<{ reply: string }> {
    return this.copilotService.reply(dto, user);
  }

  @Post('brand/extract')
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'Draft a Brand Brain from a public website (not saved; 1 credit)' })
  extractBrand(@Body() dto: ExtractBrandDto, @CurrentUser() user: AuthenticatedUser): Promise<BrandExtraction> {
    return this.brandExtractorService.extract(dto.websiteUrl, user);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available AI providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.aiService.listProviders() };
  }

  @Get('providers/status')
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'Check configuration of every AI text provider' })
  async getProviderStatuses(): Promise<{ statuses: { name: string; available: boolean }[] }> {
    return { statuses: await this.aiService.getProviderStatuses() };
  }
}
