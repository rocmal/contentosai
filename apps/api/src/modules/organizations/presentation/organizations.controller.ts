import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { OrganizationsService } from '../application/services/organizations.service';
import { CreateOrganizationDto } from '../application/dto/create-organization.dto';
import { UpdateOrganizationDto } from '../application/dto/update-organization.dto';
import { OrganizationResponseDto } from '../application/dto/organization-response.dto';
import { AddMemberDto } from '../application/dto/add-member.dto';

@ApiTags('organizations')
@ApiBearerAuth('access-token')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization (the caller becomes its owner)' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.create(dto, userId);
    return new OrganizationResponseDto(organization);
  }

  @Get()
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'List organizations' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.organizationsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((organization) => new OrganizationResponseDto(organization)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'Get an organization by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.findById(id);
    return new OrganizationResponseDto(organization);
  }

  @Patch(':id')
  @RequirePermissions('organizations.update')
  @ApiOperation({ summary: 'Update an organization' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.update(id, dto, userId);
    return new OrganizationResponseDto(organization);
  }

  @Delete(':id')
  @RequirePermissions('organizations.delete')
  @ApiOperation({ summary: 'Delete an organization' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.organizationsService.remove(id, userId);
    return { deleted: true };
  }

  @Post(':id/members')
  @RequirePermissions('organizations.manage-members')
  @ApiOperation({ summary: 'Add a member to an organization' })
  async addMember(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.addMember(id, dto, userId);
  }

  @Get(':id/members')
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'List members of an organization' })
  async listMembers(@Param('id', ParseUuidParamPipe) id: string) {
    return this.organizationsService.listMembers(id);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('organizations.manage-members')
  @ApiOperation({ summary: 'Remove a member from an organization' })
  async removeMember(
    @Param('id', ParseUuidParamPipe) id: string,
    @Param('userId', ParseUuidParamPipe) memberUserId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.organizationsService.removeMember(id, memberUserId, userId);
    return { deleted: true };
  }
}
