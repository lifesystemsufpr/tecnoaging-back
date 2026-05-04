import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { FilterEvaluationDto } from './dto/filter-evaluation.dto';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';
import {
  CurrentMonthByGenderResponseDto,
  DashboardSummaryResponseDto,
  MonthlyHistoryResponseDto,
  ProfessionalMobileSummaryResponseDto,
  TeamPerformanceResponseDto,
} from './dto/dashboard/dashboard-response.dto';

@Controller('evaluation')
@ApiBearerAuth()
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiCreatedResponse()
  async create(@Body() createEvaluationDto: CreateEvaluationDto) {
    return this.evaluationService.create(createEvaluationDto);
  }

  @Get()
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  findAll(@Query() filters: FilterEvaluationDto) {
    return this.evaluationService.findAll(filters);
  }

  @Get('dashboard/current-month-by-gender')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiOkResponse({ type: CurrentMonthByGenderResponseDto })
  getCurrentMonthByGender(@RequestUser() user: Payload) {
    return this.evaluationService.getCurrentMonthByGender(user.id);
  }

  @Get('dashboard/team-performance')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiOkResponse({ type: TeamPerformanceResponseDto })
  getTeamPerformance(@RequestUser() user: Payload) {
    return this.evaluationService.getTeamPerformance(user.id);
  }

  @Get('dashboard/monthly-history')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiOkResponse({ type: MonthlyHistoryResponseDto })
  getMonthlyHistory(@RequestUser() user: Payload) {
    return this.evaluationService.getMonthlyHistory(user.id);
  }

  @Get('dashboard/summary')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  getDashboardSummary(@RequestUser() user: Payload) {
    return this.evaluationService.getDashboardSummary(user.id);
  }

  @Get('dashboard/professional-mobile-summary')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiOkResponse({ type: ProfessionalMobileSummaryResponseDto })
  getProfessionalMobileSummary(@RequestUser() user: Payload) {
    return this.evaluationService.getProfessionalMobileSummary(user.id);
  }

  @Get(':id')
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  @Get(':id/repetitions/history')
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  async findRepetitions(@Param('id') id: string) {
    return this.evaluationService.getRepetitionsHistory(id);
  }

  @Get(':id/detailed')
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  async findOneDetailed(@Param('id') id: string) {
    return this.evaluationService.findOneDetailed(id);
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(id);
  }
}
