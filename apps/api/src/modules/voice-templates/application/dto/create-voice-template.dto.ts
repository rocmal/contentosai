import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, MaxLength } from 'class-validator';
import { VoiceTemplateVisibility } from '../../domain/entities/voice-template.entity';

export class CreateVoiceTemplateDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;

  @ApiProperty({ example: 'Hindi narrator - Priyamvada' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'piper' })
  @IsString()
  @MaxLength(80)
  provider!: string;

  @ApiProperty({ example: 'hi_IN-priyamvada-medium' })
  @IsString()
  @MaxLength(150)
  voiceId!: string;

  @ApiProperty({ example: 'hi', description: 'Language code, e.g. "en" or "hi"' })
  @IsString()
  @MaxLength(20)
  language!: string;

  @ApiProperty({
    enum: VoiceTemplateVisibility,
    description: 'private = only you can reuse it; team = anyone in your workspace can',
  })
  @IsEnum(VoiceTemplateVisibility)
  visibility!: VoiceTemplateVisibility;
}
