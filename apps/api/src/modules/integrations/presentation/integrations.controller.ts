import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { IntegrationsService } from '../application/services/integrations.service';
import { CreateIntegrationDto } from '../application/dto/create-integration.dto';
import { UpdateIntegrationDto } from '../application/dto/update-integration.dto';
import { IntegrationResponseDto } from '../application/dto/integration-response.dto';

@ApiTags('integrations')
@ApiBearerAuth('access-token')
@Controller({ path: 'integrations', version: '1' })
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  @RequirePermissions('integrations.create')
  @ApiOperation({ summary: 'Connect a third-party integration' })
  async create(
    @Body() dto: CreateIntegrationDto,
    @CurrentUser('id') userId: string,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationsService.create(dto, userId);
    return new IntegrationResponseDto(integration);
  }

  @Get()
  @RequirePermissions('integrations.read')
  @ApiOperation({ summary: 'List integrations' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.integrationsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((integration) => new IntegrationResponseDto(integration)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('integrations.read')
  @ApiOperation({ summary: 'Get an integration by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<IntegrationResponseDto> {
    const integration = await this.integrationsService.findById(id);
    return new IntegrationResponseDto(integration);
  }

  @Patch(':id')
  @RequirePermissions('integrations.update')
  @ApiOperation({ summary: 'Update an integration' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser('id') userId: string,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationsService.update(id, dto, userId);
    return new IntegrationResponseDto(integration);
  }

  @Delete(':id')
  @RequirePermissions('integrations.delete')
  @ApiOperation({ summary: 'Disconnect and delete an integration' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.integrationsService.remove(id, userId);
    return { deleted: true };
  }
}
