import { ApiProperty } from '@nestjs/swagger';
import { Setting } from '../../domain/entities/setting.entity';

export class SettingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() key: string;
  @ApiProperty({ type: Object, nullable: true }) value: unknown;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(setting: Setting) {
    this.id = setting.id;
    this.organizationId = setting.organizationId;
    this.key = setting.key;
    this.value = setting.value;
    this.createdAt = setting.createdAt;
    this.updatedAt = setting.updatedAt;
  }
}
