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
    const heapLimitMb = Number(process.env.HEALTH_HEAP_LIMIT_MB ?? 200);
    const rssLimitMb = Number(process.env.HEALTH_RSS_LIMIT_MB ?? 300);
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', heapLimitMb * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', rssLimitMb * 1024 * 1024),
    ]);
  }
}
