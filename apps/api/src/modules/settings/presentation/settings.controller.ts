import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SettingsService } from '../application/services/settings.service';
import { ListSettingsQueryDto } from '../application/dto/list-settings-query.dto';
import { UpsertSettingDto } from '../application/dto/upsert-setting.dto';
import { SettingResponseDto } from '../application/dto/setting-response.dto';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List settings' })
  async findAll(@Query() query: ListSettingsQueryDto) {
    const result = await this.settingsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: query.organizationId ? { organizationId: query.organizationId } : undefined,
    });
    return {
      items: result.items.map((setting) => new SettingResponseDto(setting)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get a setting by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<SettingResponseDto> {
    const setting = await this.settingsService.findById(id);
    return new SettingResponseDto(setting);
  }

  @Put(':organizationId/:key')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Create or update a setting value' })
  async upsert(
    @Param('organizationId', ParseUuidParamPipe) organizationId: string,
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
    @CurrentUser('id') userId: string,
  ): Promise<SettingResponseDto> {
    const setting = await this.settingsService.set(organizationId, key, dto.value, userId);
    return new SettingResponseDto(setting);
  }

  @Delete(':id')
  @RequirePermissions('settings.delete')
  @ApiOperation({ summary: 'Delete a setting' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.settingsService.remove(id, userId);
    return { deleted: true };
  }
}
