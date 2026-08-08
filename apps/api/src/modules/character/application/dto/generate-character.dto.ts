import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export const CHARACTER_PROVIDER_NAMES = ['did', 'heygen', 'synthesia', 'sadtalker', 'wav2lip'] as const;

export class GenerateCharacterDto {
  // require_tld: false so http://localhost:3001/... (SadTalker/Wav2Lip -
  // fetched from within this same Node process, not from the public
  // internet) passes validation. Cloud providers (D-ID/HeyGen/Synthesia)
  // still need an actually-reachable URL, but that's on them to fetch, not
  // something this DTO can enforce statically.
  @ApiProperty({ description: 'URL of the source photo - must be publicly fetchable for cloud providers (D-ID/HeyGen/Synthesia), localhost is fine for local providers (SadTalker/Wav2Lip)' })
  @IsUrl({ require_tld: false })
  sourceImageUrl!: string;

  @ApiProperty({ example: 'Hi, welcome to Lumora!' })
  @IsString()
  @MaxLength(2000)
  script!: string;

  @ApiProperty({ enum: CHARACTER_PROVIDER_NAMES })
  @IsIn(CHARACTER_PROVIDER_NAMES)
  provider!: (typeof CHARACTER_PROVIDER_NAMES)[number];

  @ApiPropertyOptional({ description: 'Provider-specific TTS voice id' })
  @IsOptional()
  @IsString()
  voiceId?: string;
}
