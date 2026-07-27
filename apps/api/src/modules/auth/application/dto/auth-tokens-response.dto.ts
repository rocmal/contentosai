import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@modules/users/application/dto/user-response.dto';

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: UserResponseDto;
}
