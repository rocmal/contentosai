import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { UsersService } from '../application/services/users.service';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { UserResponseDto } from '../application/dto/user-response.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create a user' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto, userId);
    return new UserResponseDto(user);
  }

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List users' })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.usersService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((user) => new UserResponseDto(user)),
      meta: result.meta,
    };
  }

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated user's profile, including current tenant context" })
  async me(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto & { organizationId: string | null; workspaceId: string | null }> {
    const user = await this.usersService.findById(currentUser.id);
    return {
      ...new UserResponseDto(user),
      organizationId: currentUser.organizationId,
      workspaceId: currentUser.workspaceId,
    };
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get a user by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return new UserResponseDto(user);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto, userId);
    return new UserResponseDto(user);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete a user' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.usersService.remove(id, userId);
    return { deleted: true };
  }
}
