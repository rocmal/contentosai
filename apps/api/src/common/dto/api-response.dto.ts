import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseMetaDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty()
  itemsPerPage!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  currentPage!: number;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  data!: T;

  @ApiProperty({ required: false, type: ApiResponseMetaDto })
  meta?: ApiResponseMetaDto;

  @ApiProperty()
  timestamp!: string;
}
