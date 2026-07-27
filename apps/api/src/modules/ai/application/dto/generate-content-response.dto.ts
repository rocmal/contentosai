import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIGenerationResult } from '../../domain/interfaces/ai-provider.interface';

export class GenerateContentResponseDto {
  @ApiProperty() text: string;
  @ApiProperty() provider: string;
  @ApiProperty() model: string;
  @ApiPropertyOptional() totalTokens?: number;

  constructor(result: AIGenerationResult) {
    this.text = result.text;
    this.provider = result.provider;
    this.model = result.model;
    this.totalTokens = result.usage?.totalTokens;
  }
}
