import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { QueryDto } from 'src/shared/dto/query.dto';

// Enum auxiliar para garantir que só ordenem por campos que existem
export enum HealthcareUnitOrderBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  CITY = 'city',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class FindHealthcareUnitsQueryDto extends QueryDto {
  // --- Filtros de Texto ---
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  // --- Filtros de Data (Audit) ---
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  // --- Ordenação Dinâmica ---
  @IsOptional()
  @IsEnum(HealthcareUnitOrderBy)
  orderBy?: HealthcareUnitOrderBy = HealthcareUnitOrderBy.NAME;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
