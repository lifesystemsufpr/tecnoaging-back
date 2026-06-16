import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ApiStandardErrors } from 'src/shared/decorators/api-standard-errors.decorator';
import { CreatePreRegistrationDto } from './dto/create-pre-registration.dto';
import { PreRegistrationService } from './pre-registration.service';

@Controller('pre-registration')
@ApiBearerAuth()
@ApiStandardErrors()
export class PreRegistrationController {
  constructor(
    private readonly preRegistrationService: PreRegistrationService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Cria ou atualiza um pré-cadastro de participante' })
  upsert(@Body() dto: CreatePreRegistrationDto) {
    return this.preRegistrationService.upsert(dto);
  }

  @Public()
  @Get(':cpf')
  @ApiOperation({
    summary: 'Verifica se existe pré-cadastro para o CPF informado',
  })
  @ApiParam({
    name: 'cpf',
    description: 'CPF do participante (11 dígitos)',
    example: '12345678901',
  })
  findByCpf(@Param('cpf') cpf: string) {
    return this.preRegistrationService.findByCpf(cpf);
  }
}
