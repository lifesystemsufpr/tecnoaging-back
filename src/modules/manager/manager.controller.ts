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
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { UpdateManagerProfileDto } from './dto/update-manager-profile.dto';
import { ManagerProfileDto } from './dto/manager-profile.dto';
import { QueryDto } from 'src/shared/dto/query.dto';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Payload } from '../auth/interfaces/auth.interface';

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

  @Get(':id')
  @Roles([SystemRole.MANAGER])
  findById(@Param('id') id: string) {
    return this.managerService.findOne(id);
  }

  @Patch(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  update(@Param('id') id: string, @Body() updateManagerDto: UpdateManagerDto) {
    return this.managerService.update(id, updateManagerDto);
  }

  @Delete(':id')
  @Roles([SystemRole.MANAGER])
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.managerService.remove(id);
  }

  @Get('profile')
  @Roles([SystemRole.MANAGER])
  @ApiOperation({
    summary: 'Get administrator profile',
    description:
      'Retrieves the authenticated administrator profile information including personal data.',
  })
  @ApiOkResponse({
    description: 'Administrator profile data',
    type: ManagerProfileDto,
  })
  async getProfile(@RequestUser() user: Payload): Promise<ManagerProfileDto> {
    return this.managerService.getProfile(user.id);
  }

  @Patch('profile')
  @Roles([SystemRole.MANAGER])
  @ApiOperation({
    summary: 'Update administrator profile',
    description:
      'Updates the authenticated administrator profile information. CPF cannot be modified.',
  })
  @ApiOkResponse({
    description: 'Updated administrator profile data',
    type: ManagerProfileDto,
  })
  async updateProfile(
    @RequestUser() user: Payload,
    @Body() updateManagerProfileDto: UpdateManagerProfileDto,
  ): Promise<ManagerProfileDto> {
    return this.managerService.updateProfile(user.id, updateManagerProfileDto);
  }
}
