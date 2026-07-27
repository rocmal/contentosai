import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty()
  @IsUUID('4')
  userId!: string;

  @ApiProperty()
  @IsUUID('4')
  roleId!: string;
}
