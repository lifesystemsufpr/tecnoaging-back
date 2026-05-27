import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { TypeEvaluation } from '@prisma/client';

export enum EvaluationSortField {
  DATE = 'date',
  TIME_END = 'time_end',
  TIME_INIT = 'time_init',
  CREATED_AT = 'createdAt',
}

export class FilterEvaluationDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrar por CPF do participante' })
  @IsOptional()
  @IsString()
  participantCpf?: string;

  @ApiProperty({ required: false, description: 'Filtrar por nome do participante' })
  @IsOptional()
  @IsString()
  participantName?: string;

  @ApiProperty({ required: false, description: 'Filtrar por CPF do profissional' })
  @IsOptional()
  @IsString()
  healthProfessionalCpf?: string;

  @ApiProperty({ required: false, description: 'Filtrar por nome do profissional' })
  @IsOptional()
  @IsString()
  healthProfessionalName?: string;

  @ApiProperty({
    required: false,
    enum: TypeEvaluation,
    description: 'Tipo de avaliação (FTSTS, TTSTS ou TMSTS)',
  })
  @IsOptional()
  @IsEnum(TypeEvaluation)
  type?: TypeEvaluation;

  @ApiProperty({ required: false, description: 'Filtrar por ID do participante' })
  @IsOptional()
  @IsString()
  participantId?: string;

  @ApiProperty({ required: false, description: 'Filtrar por ID da unidade de saúde' })
  @IsOptional()
  @IsString()
  healthcareUnitId?: string;

  @ApiProperty({ required: false, description: 'Filtrar por nome da unidade de saúde' })
  @IsOptional()
  @IsString()
  healthcareUnitName?: string;

  @ApiProperty({ required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({ required: false, description: 'Data final (YYYY-MM-DD)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({
    required: false,
    enum: EvaluationSortField,
    description: 'Campo para ordenação. Valores inválidos são ignorados. Padrão: time_end desc.',
  })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Direção da ordenação',
  })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}
