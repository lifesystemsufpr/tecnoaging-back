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
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { FindInstitutionsQueryDto } from './dto/find-institution-query.dto';

@Controller('institution')
@ApiBearerAuth()
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  @Roles([SystemRole.MANAGER])
  create(@Body() createInstitutionDto: CreateInstitutionDto) {
    return this.institutionService.create(createInstitutionDto);
  }

  @Get()
  findAll(@Query() query: FindInstitutionsQueryDto) {
    return this.institutionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutionService.findOne(id);
  }

  @Patch(':id')
  @Roles([SystemRole.MANAGER])
  update(
    @Param('id') id: string,
    @Body() updateInstitutionDto: UpdateInstitutionDto,
  ) {
    return this.institutionService.update(id, updateInstitutionDto);
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  remove(@Param('id') id: string) {
    return this.institutionService.remove(id);
  }
}
