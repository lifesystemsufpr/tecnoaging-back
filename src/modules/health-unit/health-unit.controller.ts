import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { HealthUnitService } from './health-unit.service';
import { CreateHealthUnitDto } from './dto/create-health-unit.dto';
import { UpdateHealthUnitDto } from './dto/update-health-unit.dto';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';

@Controller('health-unit')
@ApiBearerAuth()
export class HealthUnitController {
  constructor(private readonly healthUnitService: HealthUnitService) {}

  @Post()
  @Roles([SystemRole.MANAGER])
  async create(@Body() createHealthUnitDto: CreateHealthUnitDto) {
    return this.healthUnitService.create(createHealthUnitDto);
  }

  @Get()
  findAll() {
    return this.healthUnitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.healthUnitService.findOne(id);
  }

  @Patch(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  update(
    @Param('id') id: string,
    @Body() updateHealthUnitDto: UpdateHealthUnitDto,
  ) {
    return this.healthUnitService.update(id, updateHealthUnitDto);
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.healthUnitService.remove(id);
  }
}
