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
import { QueryDto } from 'src/shared/dto/query.dto';
@Controller('participant')
@ApiBearerAuth()
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  //Ver se vai ficar publico mesmo
  @Public()
  @Post()
  create(@Body() createParticipantDto: CreateParticipantDto) {
    return this.participantService.create(createParticipantDto);
  }

  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @Get()
  findAll(@Query() queryDto: QueryDto) {
    return this.participantService.findAll(queryDto);
  }

  @Roles([SystemRole.PARTICIPANT, SystemRole.HEALTH_PROFESSIONAL])
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

  @Roles([SystemRole.HEALTH_PROFESSIONAL])
  @Delete(':id')
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.participantService.remove(id);
  }
}
