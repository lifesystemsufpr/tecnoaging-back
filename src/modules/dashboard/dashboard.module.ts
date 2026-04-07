import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardAdvancedController } from './dashboard-advanced.controller';
import { DashboardAdvancedService } from './dashboard-advanced.service';
import { DashboardAdvancedRepository } from './repositories/dashboard-advanced.repository';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, DashboardAdvancedController],
  providers: [
    DashboardService,
    DashboardRepository,
    DashboardAdvancedService,
    DashboardAdvancedRepository,
  ],
})
export class DashboardModule {}
