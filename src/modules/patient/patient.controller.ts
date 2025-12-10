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
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { QueryDto } from '../../shared/dto/query.dto';
@Controller('patient')
@ApiBearerAuth()
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  //Ver se vai ficar publico mesmo
  @Public()
  @Post()
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.create(createPatientDto);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @Get()
  findAll(@Query() queryDto: QueryDto) {
    return this.patientService.findAll(queryDto);
  }

  @Roles([SystemRole.PATIENT, SystemRole.HEALTH_PROFESSIONAL])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientService.findOne(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @Patch(':id')
  @ApiNoContentResponse()
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientService.update(id, updatePatientDto);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @Delete(':id')
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.patientService.remove(id);
  }
}
