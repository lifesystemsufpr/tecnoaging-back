import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryDto } from 'src/shared/dto/query.dto';
import { TypeEvaluation } from '@prisma/client';

export class FilterEvaluationDto extends QueryDto {
  @IsOptional()
  @IsString()
  participantCpf?: string;

  @IsOptional()
  @IsString()
  participantName?: string;

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
