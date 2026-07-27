import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const VOICE_PROVIDER_NAMES = ['elevenlabs', 'cartesia', 'azure'] as const;

export class GenerateSpeechDto {
  @ApiProperty({ example: 'Welcome to Lumora, your AI content operating system.' })
  @IsString()
  @MaxLength(5000)
  text!: string;

  @ApiProperty({ enum: VOICE_PROVIDER_NAMES })
  @IsIn(VOICE_PROVIDER_NAMES)
  provider!: (typeof VOICE_PROVIDER_NAMES)[number];

  @ApiPropertyOptional({
    description: 'Vendor-specific voice id; provider default used if omitted',
  })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;
}
