import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ManagerService } from './manager.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { QueryDto } from 'src/shared/dto/query.dto';

@Controller('manager')
@ApiBearerAuth()
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post()
  @Roles([SystemRole.MANAGER])
  create(@Body() createManagerDto: CreateManagerDto) {
    return this.managerService.create(createManagerDto);
  }

  @Get()
  @Roles([SystemRole.MANAGER])
  findAll(@Query() queryDto: QueryDto) {
    return this.managerService.findAll(queryDto);
  }

  @Get(':cpf')
  @Roles([SystemRole.MANAGER])
  findByCpf(@Param('cpf') cpf: string) {
    return this.managerService.findByCpf(cpf);
  }

  @Patch(':cpf')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  update(
    @Param('cpf') cpf: string,
    @Body() updateManagerDto: UpdateManagerDto,
  ) {
    return this.managerService.update(cpf, updateManagerDto);
  }

  @Delete(':cpf')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('cpf') cpf: string) {
    return this.managerService.remove(cpf);
  }
}
