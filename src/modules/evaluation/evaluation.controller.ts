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
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { FilterEvaluationDto } from './dto/filter-evaluation.dto';
import { CriarAvaliacaoIvcf20Dto } from './dto/criar-avaliacao-ivcf20.dto';
import { RespostaAvaliacaoIvcf20Dto } from './dto/resposta-avaliacao-ivcf20.dto';

@Controller('evaluation')
@ApiBearerAuth()
@ApiTags('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) { }

  @Post()
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiCreatedResponse()
  async create(@Body() createEvaluationDto: CreateEvaluationDto) {
    return this.evaluationService.create(createEvaluationDto);
  }

  @Get()
  findAll(@Query() filters: FilterEvaluationDto) {
    return this.evaluationService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(id);
  }

  // Endpoints IVCF-20

  @Post('ivcf20')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiCreatedResponse({ type: RespostaAvaliacaoIvcf20Dto })
  async criarIvcf20(
    @Body() criarAvaliacaoIvcf20Dto: CriarAvaliacaoIvcf20Dto,
  ): Promise<RespostaAvaliacaoIvcf20Dto> {
    return this.evaluationService.criarIvcf20(criarAvaliacaoIvcf20Dto);
  }

  @Get('ivcf20/:id')
  @ApiOkResponse({ type: RespostaAvaliacaoIvcf20Dto })
  async buscarUmIvcf20(
    @Param('id') id: string,
  ): Promise<RespostaAvaliacaoIvcf20Dto> {
    return this.evaluationService.buscarUmIvcf20(id);
  }
}
