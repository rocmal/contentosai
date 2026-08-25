import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefineVideoTurnDto {
  @ApiProperty({
    example: 'Make the lighting warmer. Keep everything else the same.',
    description:
      'Short, simple edit instruction. Overly descriptive prompts cause unintended changes.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  instruction!: string;
}
