import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import {
  assertInWorkspace,
  ownedBy,
  tenantScope,
  workspaceFilters,
} from '@shared/security/tenant-scope';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { CalendarEventsService } from '../application/services/calendar-events.service';
import { CreateCalendarEventDto } from '../application/dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from '../application/dto/update-calendar-event.dto';
import { CalendarEventResponseDto } from '../application/dto/calendar-event-response.dto';

@ApiTags('calendar')
@ApiBearerAuth('access-token')
@Controller({ path: 'calendar/events', version: '1' })
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  @Post()
  @RequirePermissions('calendar.create')
  @ApiOperation({ summary: 'Create a calendar event' })
  async create(
    @Body() dto: CreateCalendarEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CalendarEventResponseDto> {
    const calendarEvent = await this.calendarEventsService.create(
      ownedBy(dto, tenantScope(user)),
      user.id,
    );
    return new CalendarEventResponseDto(calendarEvent);
  }

  @Get()
  @RequirePermissions('calendar.read')
  @ApiOperation({ summary: 'List calendar events' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.calendarEventsService.findAll({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: workspaceFilters(tenantScope(user)),
    });
    return {
      items: result.items.map((calendarEvent) => new CalendarEventResponseDto(calendarEvent)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('calendar.read')
  @ApiOperation({ summary: 'Get a calendar event by id' })
  async findOne(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CalendarEventResponseDto> {
    const calendarEvent = assertInWorkspace(
      await this.calendarEventsService.findById(id),
      tenantScope(user),
      'Calendar event',
    );
    return new CalendarEventResponseDto(calendarEvent);
  }

  @Patch(':id')
  @RequirePermissions('calendar.update')
  @ApiOperation({ summary: 'Update a calendar event' })
  async update(
    @Param('id', ParseUuidParamPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CalendarEventResponseDto> {
    assertInWorkspace(
      await this.calendarEventsService.findById(id),
      tenantScope(user),
      'Calendar event',
    );
    const calendarEvent = await this.calendarEventsService.update(id, dto, user.id);
    return new CalendarEventResponseDto(calendarEvent);
  }

  @Delete(':id')
  @RequirePermissions('calendar.delete')
  @ApiOperation({ summary: 'Delete a calendar event' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    assertInWorkspace(
      await this.calendarEventsService.findById(id),
      tenantScope(user),
      'Calendar event',
    );
    await this.calendarEventsService.remove(id, user.id);
    return { deleted: true };
  }
}
