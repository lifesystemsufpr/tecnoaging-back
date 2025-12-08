import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryDto } from '../../../shared/dto/query.dto';
import { TypeEvaluation } from '@prisma/client';

export class FilterEvaluationDto extends QueryDto {
  @IsOptional()
  @IsString()
  patientCpf?: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  healthProfessionalCpf?: string;

  @IsOptional()
  @IsString()
  healthProfessionalName?: string;

  @IsOptional()
  @IsEnum(TypeEvaluation)
  type?: TypeEvaluation;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
