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
import { LinkParticipantDto, UpdateHealthProfessionalDto } from './dto/update-health-professional.dto';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SystemRole } from '@prisma/client';
import { FindHealthProfessionalsQueryDto } from './dto/find-health-professionals-query.dto';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';
import { DeactivateDto } from 'src/shared/dto/deactivate.dto';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';

@Controller('health-professional')
@ApiBearerAuth()
@ApiStandardErrors()
export class HealthProfessionalController {
  constructor(
    private readonly healthProfessionalService: HealthProfessionalService,
  ) {}

  @Public()
  @Post()
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
  remove(
    @Param('id') id: string,
    @Body() dto: DeactivateDto,
    @RequestUser() user: Payload,
  ) {
    return this.healthProfessionalService.remove(id, user.id, dto.reason);
  }

  @Patch(':id/reactivate')
  @Roles([SystemRole.MANAGER])
  reactivate(@Param('id') id: string, @RequestUser() user: Payload) {
    return this.healthProfessionalService.reactivate(id, user.id);
  }

  @Post('link-participant')
  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  linkParticipant(
    @RequestUser() user: Payload,
    @Body() body: LinkParticipantDto,
  ) {
    return this.healthProfessionalService.linkParticipant(body, user.id);
  }
}
