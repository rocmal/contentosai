import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const VOICE_PROVIDER_NAMES = [
  'edge',
  'elevenlabs',
  'cartesia',
  'azure',
  'piper',
  'sarvam',
] as const;

export class GenerateSpeechDto {
  @ApiProperty({ example: 'Welcome to Lumora, your AI content operating system.' })
  @IsString()
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({
    enum: VOICE_PROVIDER_NAMES,
    description: 'Defaults to the VOICE_PROVIDER environment variable ("edge") when omitted',
  })
  @IsOptional()
  @IsIn(VOICE_PROVIDER_NAMES)
  provider?: (typeof VOICE_PROVIDER_NAMES)[number];

  @ApiPropertyOptional({
    example: 'en-US-AriaNeural',
    description: 'Vendor-specific voice id; provider default used if omitted',
  })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 'hi-IN',
    description: 'BCP-47 language code; only used by multi-language providers (currently Sarvam)',
  })
  @IsOptional()
  @IsString()
  languageCode?: string;
}
