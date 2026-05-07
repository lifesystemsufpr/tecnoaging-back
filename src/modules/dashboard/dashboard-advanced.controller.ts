import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role-guard.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';
import { DashboardAdvancedService } from './dashboard-advanced.service';
import {
  CurrentMonthEvaluationsDto,
  DashboardSummaryDto,
  EvaluationsByTestAndGenderDto,
  Gender,
  MonthlyHistoryDto,
  PercentileEntryDto,
  TestType,
} from './dto/dashboard-advanced.dto';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';

@Controller('dashboard/advanced')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiStandardErrors()
export class DashboardAdvancedController {
  constructor(private service: DashboardAdvancedService) {}

  @Get('average-test-by-age-group')
  @Roles([SystemRole.RESEARCHER, SystemRole.MANAGER])
  async getAverageTestByAgeGroup(
    @Query('gender') gender?: Gender,
  ): Promise<PercentileEntryDto[]> {
    return this.service.getAverageTestByAgeGroup(gender);
  }

  @Get('monthly-history')
  @Roles([SystemRole.RESEARCHER, SystemRole.MANAGER])
  async getMonthlyHistory(
    @RequestUser() user: Payload,
    @Query('gender') gender?: Gender,
  ): Promise<MonthlyHistoryDto[]> {
    return this.service.getMonthlyHistory(user.id, gender);
  }

  @Get('summary')
  @Roles([SystemRole.RESEARCHER, SystemRole.MANAGER])
  async getDashboardSummary(
    @RequestUser() user: Payload,
    @Query('gender') gender?: Gender,
  ): Promise<DashboardSummaryDto> {
    return this.service.getDashboardSummary(user.id, gender);
  }

  @Get('current-month')
  @Roles([SystemRole.RESEARCHER, SystemRole.MANAGER])
  async getCurrentMonthEvaluations(
    @RequestUser() user: Payload,
    @Query('gender') gender?: Gender,
  ): Promise<CurrentMonthEvaluationsDto> {
    return this.service.getCurrentMonthEvaluations(user.id, gender);
  }

  @Get('by-test-and-gender')
  @Roles([SystemRole.RESEARCHER, SystemRole.MANAGER])
  async getEvaluationsByTestAndGender(
    @RequestUser() user: Payload,
    @Query('test') test?: TestType,
    @Query('gender') gender?: Gender,
  ): Promise<EvaluationsByTestAndGenderDto[]> {
    return this.service.getEvaluationsByTestAndGender(user.id, test, gender);
  }
}
