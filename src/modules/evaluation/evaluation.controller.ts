import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EvaluationService } from './services/evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { FilterEvaluationDto } from './dto/filter-evaluation.dto';

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
    return this.evaluationService.filter(filters);
  }

  @Get(':id')
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(id);
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
