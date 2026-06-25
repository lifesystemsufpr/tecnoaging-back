import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { QuestionnaireService } from './questionnaire.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { FilterQuestionnaireResponseDto } from './dto/filter-questionnaire-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';

@Controller('questionnaires')
@ApiBearerAuth()
@ApiStandardErrors()
export class QuestionnaireController {
  constructor(private readonly service: QuestionnaireService) {}

  @Get('ivcf-20')
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  getStructure() {
    return this.service.getIvcfStructure();
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get()
  findAll(
    @RequestUser() user: Payload,
    @Query() query: FilterQuestionnaireResponseDto,
  ) {
    return this.service.findAll(query, user);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Post('response')
  create(@RequestUser() user: Payload, @Body() dto: CreateResponseDto) {
    if (user.role !== SystemRole.HEALTH_PROFESSIONAL && !dto.healthProfessionalId) {
      throw new BadRequestException(
        'healthProfessionalId é obrigatório para pesquisadores.',
      );
    }

    return this.service.createResponse({
      ...dto,
      healthProfessionalId:
        user.role === SystemRole.HEALTH_PROFESSIONAL
          ? user.id
          : dto.healthProfessionalId,
    });
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId')
  getByParticipant(@Param('participantId') id: string) {
    return this.service.findAllByParticipant(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId/evolution')
  getParticipantEvolution(@Param('participantId') id: string) {
    return this.service.getParticipantEvolution(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId/evolution/daily')
  getParticipantEvolutionDaily(@Param('participantId') id: string) {
    return this.service.getParticipantEvolutionDaily(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId/summary')
  getParticipantSummary(@Param('participantId') id: string) {
    return this.service.getParticipantSummary(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId/score-history')
  getScoreHistory(@Param('participantId') id: string) {
    return this.service.getScoreHistory(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId/domain-history')
  getDomainHistory(@Param('participantId') id: string) {
    return this.service.getDomainHistory(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('participant/:participantId/assessment/:assessmentId')
  getAssessmentDetail(
    @Param('participantId') participantId: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.service.getAssessmentDetail(participantId, assessmentId);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get('response/:id')
  getOneResponse(@Param('id') id: string) {
    return this.service.findOneResponse(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Post('responses/recompute')
  recomputeResponses() {
    return this.service.recomputeAllResponses();
  }
}
