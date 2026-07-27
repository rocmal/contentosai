import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  SequelizeHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@common/decorators/public.decorator';

const MAX_HEAP_BYTES = 300 * 1024 * 1024;

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly sequelize: SequelizeHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.sequelize.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', MAX_HEAP_BYTES),
    ]);
  }
}
