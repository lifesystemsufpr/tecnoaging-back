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
import { FindResearchersQueryDto } from './dto/find-researchers-query.dto';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';
import { DeactivateDto } from 'src/shared/dto/deactivate.dto';

@Controller('researcher')
@ApiBearerAuth()
@ApiStandardErrors()
export class ResearcherController {
  constructor(private readonly researcherService: ResearcherService) {}

  @Post()
  @Roles([SystemRole.MANAGER])
  create(@Body() createResearcherDto: CreateResearcherDto) {
    return this.researcherService.create(createResearcherDto);
  }

  @Get()
  @Roles([SystemRole.RESEARCHER])
  findAll(@Query() queryDto: FindResearchersQueryDto) {
    return this.researcherService.findAll(queryDto);
  }

  @Get('/population')
  @Roles([SystemRole.RESEARCHER])
  async population(@RequestUser() user: Payload) {
    return this.researcherService.getResearcherPopulationData(user.id);
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
  remove(
    @Param('id') id: string,
    @Body() dto: DeactivateDto,
    @RequestUser() user: Payload,
  ) {
    return this.researcherService.remove(id, user.id, dto.reason);
  }

  @Patch(':id/reactivate')
  @Roles([SystemRole.MANAGER])
  reactivate(@Param('id') id: string, @RequestUser() user: Payload) {
    return this.researcherService.reactivate(id, user.id);
  }
}
