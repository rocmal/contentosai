import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomVoiceDto {
  @ApiProperty({ example: 'My voice', description: 'Name shown in the Voice dropdown' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    description:
      "Must be true: the recording is the uploader's own voice, or they have permission to use it",
  })
  // Multipart fields arrive as strings.
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  consent!: boolean;
}
