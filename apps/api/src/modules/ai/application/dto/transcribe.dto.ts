import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { TRANSCRIBE_LANGUAGES, TranscribeLanguage } from '../services/transcription.service';

export class TranscribeDto {
  @ApiPropertyOptional({ enum: TRANSCRIBE_LANGUAGES, default: 'auto' })
  @IsOptional()
  @IsIn(TRANSCRIBE_LANGUAGES)
  language?: TranscribeLanguage;
}
