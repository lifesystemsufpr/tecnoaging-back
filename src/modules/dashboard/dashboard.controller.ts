import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import {
  EvaluationsCountDto,
  MostPerformedTestsDto,
  AverageDurationDto,
  MonthlyEvaluationsDto,
  MonthlyAverageDto,
} from './dto';
import { RoleGuard } from '../auth/guards/role-guard.guard';
import { Payload } from '../auth/interfaces/auth.interface';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiStandardErrors()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('participant/evaluations-count')
  @Roles([
    SystemRole.PARTICIPANT,
    SystemRole.HEALTH_PROFESSIONAL,
    SystemRole.RESEARCHER,
  ])
  async getEvaluationsCount(
    @RequestUser() user: Payload,
  ): Promise<EvaluationsCountDto> {
    return this.dashboardService.getEvaluationsCount(user.id);
  }

  @Get('participant/most-performed-tests')
  @Roles([
    SystemRole.PARTICIPANT,
    SystemRole.HEALTH_PROFESSIONAL,
    SystemRole.RESEARCHER,
  ])
  async getMostPerformedTests(
    @RequestUser() user: Payload,
  ): Promise<MostPerformedTestsDto> {
    return this.dashboardService.getMostPerformedTests(user.id);
  }

  @Get('participant/average-duration')
  @Roles([
    SystemRole.PARTICIPANT,
    SystemRole.HEALTH_PROFESSIONAL,
    SystemRole.RESEARCHER,
  ])
  async getAverageDuration(
    @RequestUser() user: Payload,
  ): Promise<AverageDurationDto> {
    return this.dashboardService.getAverageDuration(user.id);
  }

  @Get('participant/monthly-evaluations')
  @Roles([
    SystemRole.PARTICIPANT,
    SystemRole.HEALTH_PROFESSIONAL,
    SystemRole.RESEARCHER,
  ])
  async getMonthlyEvaluations(
    @RequestUser() user: Payload,
  ): Promise<MonthlyEvaluationsDto> {
    return this.dashboardService.getMonthlyEvaluations(user.id);
  }

  @Get('participant/monthly-average')
  @Roles([
    SystemRole.PARTICIPANT,
    SystemRole.HEALTH_PROFESSIONAL,
    SystemRole.RESEARCHER,
  ])
  async getMonthlyAverage(
    @RequestUser() user: Payload,
  ): Promise<MonthlyAverageDto> {
    return this.dashboardService.getMonthlyAverage(user.id);
  }
}
