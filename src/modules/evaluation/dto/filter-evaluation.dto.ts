import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryDto } from 'src/shared/dto/query.dto'; // Assumindo que este path está correto no seu projeto
import { TypeEvaluation } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class FilterEvaluationDto extends QueryDto {
  @ApiProperty({
    required: false,
    description: 'Filtrar por CPF do participante',
  })
  @IsOptional()
  @IsString()
  participantCpf?: string;

  @ApiProperty({
    required: false,
    description: 'Filtrar por nome do participante',
  })
  @IsOptional()
  @IsString()
  participantName?: string;

  @ApiProperty({
    required: false,
    description: 'Filtrar por CPF do profissional',
  })
  @IsOptional()
  @IsString()
  healthProfessionalCpf?: string;

  @ApiProperty({
    required: false,
    description: 'Filtrar por nome do profissional',
  })
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
}
