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
import { ParticipantService } from './participant.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { FindParticipantsQueryDto } from './dto/find-participants-query.dto';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';
import { DeactivateDto } from 'src/shared/dto/deactivate.dto';

@Controller('participant')
@ApiBearerAuth()
@ApiStandardErrors()
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  //Ver se vai ficar publico mesmo
  @Public()
  @Post()
  create(@Body() createParticipantDto: CreateParticipantDto) {
    return this.participantService.create(createParticipantDto);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.RESEARCHER])
  @Get()
  findAll(@Query() queryDto: FindParticipantsQueryDto) {
    return this.participantService.findAll(queryDto);
  }

  @Roles([
    SystemRole.PARTICIPANT,
    SystemRole.HEALTH_PROFESSIONAL,
    SystemRole.RESEARCHER,
  ])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.participantService.findOne(id);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @Patch(':id')
  @ApiNoContentResponse()
  update(
    @Param('id') id: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ) {
    return this.participantService.update(id, updateParticipantDto);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL, SystemRole.MANAGER])
  @Delete(':id')
  @ApiNoContentResponse()
  remove(
    @Param('id') id: string,
    @Body() dto: DeactivateDto,
    @RequestUser() user: Payload,
  ) {
    return this.participantService.remove(id, user.id, dto.reason);
  }

  @Patch(':id/reactivate')
  @Roles([SystemRole.MANAGER])
  reactivate(@Param('id') id: string, @RequestUser() user: Payload) {
    return this.participantService.reactivate(id, user.id);
  }
}
