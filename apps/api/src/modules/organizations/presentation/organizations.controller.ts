import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { PlatformAdminOnly } from '@common/decorators/platform-admin.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { assertOwnOrganization, tenantScope } from '@shared/security/tenant-scope';
import { OrganizationsService } from '../application/services/organizations.service';
import { CreateOrganizationDto } from '../application/dto/create-organization.dto';
import { UpdateOrganizationDto } from '../application/dto/update-organization.dto';
import { OrganizationResponseDto } from '../application/dto/organization-response.dto';
import { AddMemberDto } from '../application/dto/add-member.dto';

/**
 * A customer only ever reaches their own organization: another one's id looks "not found", and its member list,
 * lookup and add/remove are refused the same way. Creating or deleting organizations, and listing all of them, is
 * for Lumora's platform admins (signing up creates a customer's organization).
 */
@ApiTags('organizations')
@ApiBearerAuth('access-token')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @PlatformAdminOnly()
  @ApiOperation({
    summary: 'Create an organization (platform admins; the caller becomes its owner)',
  })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('id') userId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.create(dto, userId);
    return new OrganizationResponseDto(organization);
  }

  @Get()
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'List organizations (your own; every one for platform admins)' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const scope = tenantScope(user);
    const result = await this.organizationsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: scope.isPlatformAdmin ? undefined : { id: scope.organizationId ?? '' },
    });
    return {
      items: result.items.map((organization) => new OrganizationResponseDto(organization)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'Get an organization by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    assertOwnOrganization(id, tenantScope(user));
    const organization = await this.organizationsService.findById(id);
    return new OrganizationResponseDto(organization);
  }

  @Patch(':id')
  @RequirePermissions('organizations.update')
  @ApiOperation({ summary: 'Update an organization' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    assertOwnOrganization(id, tenantScope(user));
    const organization = await this.organizationsService.update(id, dto, user.id);
    return new OrganizationResponseDto(organization);
  }

  @Delete(':id')
  @PlatformAdminOnly()
  @RequirePermissions('organizations.delete')
  @ApiOperation({ summary: 'Delete an organization (platform admins)' })
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertOwnOrganization(id, tenantScope(user));
    return this.organizationsService.addMember(id, dto, user.id);
  }

  @Get(':id/members/lookup')
  @RequirePermissions('organizations.manage-members')
  @ApiOperation({
    summary:
      "Look up a signed-up user by email to invite them (doesn't require knowing their user id)",
  })
  async lookupMemberCandidate(
    @Param('id', ParseUuidParamPipe) id: string,
    @Query('email') email: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertOwnOrganization(id, tenantScope(user));
    await this.organizationsService.findById(id);
    const candidate = await this.organizationsService.findMemberCandidateByEmail(email);
    return { candidate };
  }

  @Get(':id/members')
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'List members of an organization' })
  async listMembers(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertOwnOrganization(id, tenantScope(user));
    return this.organizationsService.listMembers(id);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('organizations.manage-members')
  @ApiOperation({ summary: 'Remove a member from an organization' })
  async removeMember(
    @Param('id', ParseUuidParamPipe) id: string,
    @Param('userId', ParseUuidParamPipe) memberUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    assertOwnOrganization(id, tenantScope(user));
    await this.organizationsService.removeMember(id, memberUserId, user.id);
    return { deleted: true };
  }
}
