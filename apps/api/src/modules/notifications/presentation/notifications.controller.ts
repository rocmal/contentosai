import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { NotificationsService } from '../application/services/notifications.service';
import { CreateNotificationDto } from '../application/dto/create-notification.dto';
import { UpdateNotificationDto } from '../application/dto/update-notification.dto';
import { NotificationResponseDto } from '../application/dto/notification-response.dto';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions('notifications.create')
  @ApiOperation({ summary: 'Create a notification' })
  async create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser('id') userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.create(dto, userId);
    return new NotificationResponseDto(notification);
  }

  @Get()
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'List notifications for the current user' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser('id') userId: string) {
    const result = await this.notificationsService.findByUser(userId, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      items: result.items.map((notification) => new NotificationResponseDto(notification)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('notifications.read')
  @ApiOperation({ summary: 'Get a notification by id' })
  async findOne(@Param('id', ParseUuidParamPipe) id: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.findById(id);
    return new NotificationResponseDto(notification);
  }

  @Patch(':id')
  @RequirePermissions('notifications.update')
  @ApiOperation({ summary: 'Update a notification' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateNotificationDto,
    @CurrentUser('id') userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.update(id, dto, userId);
    return new NotificationResponseDto(notification);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications.update')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.markAsRead(id, userId);
    return new NotificationResponseDto(notification);
  }

  @Delete(':id')
  @RequirePermissions('notifications.delete')
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.notificationsService.remove(id, userId);
    return { deleted: true };
  }
}
