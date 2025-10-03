import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/modules/auth/decorators/public.decorator';

@Controller('status')
@Public()
export class HealthcheckController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150 MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150 MB
    ]);
  }
}
