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
import { FindHealthProfessionalsQueryDto } from './dto/find-health-professionals-query.dto';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';

@Controller('health-professional')
@ApiBearerAuth()
@ApiStandardErrors()
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
  findAll(@Query() queryDto: FindHealthProfessionalsQueryDto) {
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
