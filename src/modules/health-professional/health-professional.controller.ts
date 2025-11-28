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
import { HealthProfessionalService } from './health-professional.service';
import { CreateHealthProfessionalDto } from './dto/create-health-professional.dto';
import { UpdateHealthProfessionalDto } from './dto/update-health-professional.dto';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { QueryDto } from 'src/shared/dto/query.dto';

@Controller('health-professional')
@ApiBearerAuth()
export class HealthProfessionalController {
  constructor(
    private readonly healthProfessionalService: HealthProfessionalService,
  ) {}

  @Post()
  @Roles([SystemRole.MANAGER])
  create(@Body() createHealthProfessionalDto: CreateHealthProfessionalDto) {
    return this.healthProfessionalService.create(createHealthProfessionalDto);
  }

  @Get()
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  findAll(@Query() queryDto: QueryDto) {
    return this.healthProfessionalService.findAll(queryDto);
  }

  @Get(':id')
  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  findOne(@Param('id') id: string) {
    return this.healthProfessionalService.findOne(id);
  }

  @Patch(':id')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @ApiNoContentResponse()
  update(
    @Param('id') id: string,
    @Body() updateHealthProfessionalDto: UpdateHealthProfessionalDto,
  ) {
    return this.healthProfessionalService.update(
      id,
      updateHealthProfessionalDto,
    );
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.healthProfessionalService.remove(id);
  }
}
