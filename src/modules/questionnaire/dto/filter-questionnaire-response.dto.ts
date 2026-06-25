import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterQuestionnaireResponseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  participantEmail?: string;

  @IsOptional()
  @IsString()
  participantCpf?: string;

  @IsOptional()
  @IsString()
  participantName?: string;

  @IsOptional()
  @IsString()
  healthProfessionalEmail?: string;

  @IsOptional()
  @IsString()
  healthProfessionalCpf?: string;

  @IsOptional()
  @IsString()
  healthProfessionalName?: string;

  @IsOptional()
  @IsString()
  questionnaireSlug?: string;

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}
