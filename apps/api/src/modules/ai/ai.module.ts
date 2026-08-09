import { Module } from '@nestjs/common';
import { OpenAIProvider } from './infrastructure/providers/openai.provider';
import { GeminiProvider } from './infrastructure/providers/gemini.provider';
import { ClaudeProvider } from './infrastructure/providers/claude.provider';
import { OpenRouterProvider } from './infrastructure/providers/openrouter.provider';
import { SarvamProvider } from './infrastructure/providers/sarvam.provider';
import { AIProviderFactory } from './infrastructure/ai-provider.factory';
import { AiService } from './application/services/ai.service';
import { AiController } from './presentation/ai.controller';

@Module({
  controllers: [AiController],
  providers: [
    OpenAIProvider,
    GeminiProvider,
    ClaudeProvider,
    OpenRouterProvider,
    SarvamProvider,
    AIProviderFactory,
    AiService,
  ],
  exports: [AiService, AIProviderFactory],
})
export class AiModule {}
