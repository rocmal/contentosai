import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CopilotTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  text!: string;
}

export class CopilotMessageDto {
  @ApiProperty({ example: 'Give me 3 hooks for a retirement-planning reel' })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ description: 'The screen the user is on, e.g. "ai-studio"' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  screen?: string;

  @ApiPropertyOptional({ type: [CopilotTurnDto], description: 'Recent conversation turns, oldest first' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CopilotTurnDto)
  history?: CopilotTurnDto[];
}
