import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ResearcherService } from './researcher.service';
import { CreateResearcherDto } from './dto/create-researcher.dto';
import { UpdateResearcherDto } from './dto/update-researcher.dto';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { QueryDto } from '../../shared/dto/query.dto';

@Controller('researcher')
@ApiBearerAuth()
export class ResearcherController {
  constructor(private readonly researcherService: ResearcherService) {}

  @Post()
  @Roles([SystemRole.MANAGER])
  create(@Body() createResearcherDto: CreateResearcherDto) {
    return this.researcherService.create(createResearcherDto);
  }

  @Get()
  @Roles([SystemRole.RESEARCHER])
  findAll(@Query() queryDto: QueryDto) {
    return this.researcherService.findAll(queryDto);
  }

  @Get(':id')
  @Roles([SystemRole.RESEARCHER])
  findOne(@Param('id') id: string) {
    return this.researcherService.findOne(id);
  }

  @Patch(':id')
  @Roles([SystemRole.RESEARCHER])
  @ApiNoContentResponse()
  update(
    @Param('id') id: string,
    @Body() updateResearcherDto: UpdateResearcherDto,
  ) {
    return this.researcherService.update(id, updateResearcherDto);
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.researcherService.remove(id);
  }
}
