import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { CreateResponseDto } from './dto/create-response.dto';

@Controller('questionnaires')
export class QuestionnaireController {
  constructor(private readonly service: QuestionnaireService) {}

  @Get('ivcf-20')
  getStructure() {
    return this.service.getIvcfStructure();
  }

  @Post('response')
  create(@Body() dto: CreateResponseDto) {
    return this.service.createResponse(dto);
  }

  @Get('participant/:participantId')
  getByParticipant(@Param('participantId') id: string) {
    return this.service.findAllByParticipant(id);
  }

  @Get('response/:id')
  getOneResponse(@Param('id') id: string) {
    return this.service.findOneResponse(id);
  }
}
