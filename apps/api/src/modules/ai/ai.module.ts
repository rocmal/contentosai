import { Module } from '@nestjs/common';
import { BrandModule } from '@modules/brand/brand.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { OpenAIProvider } from './infrastructure/providers/openai.provider';
import { GeminiProvider } from './infrastructure/providers/gemini.provider';
import { ClaudeProvider } from './infrastructure/providers/claude.provider';
import { OpenRouterProvider } from './infrastructure/providers/openrouter.provider';
import { SarvamProvider } from './infrastructure/providers/sarvam.provider';
import { AIProviderFactory } from './infrastructure/ai-provider.factory';
import { ContentStudioService } from './application/services/content-studio.service';
import { CopilotService } from './application/services/copilot.service';
import { BrandExtractorService } from './application/services/brand-extractor.service';
import { AiService } from './application/services/ai.service';
import { AiController } from './presentation/ai.controller';

@Module({
  imports: [BrandModule, CreditsModule],
  controllers: [AiController],
  providers: [
    OpenAIProvider,
    GeminiProvider,
    ClaudeProvider,
    OpenRouterProvider,
    SarvamProvider,
    AIProviderFactory,
    AiService,
    ContentStudioService,
    CopilotService,
    BrandExtractorService,
  ],
  exports: [AiService, AIProviderFactory],
})
export class AiModule {}
