import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { QueryDto } from 'src/shared/dto/query.dto';

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

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsEnum(HealthcareUnitOrderBy)
  orderBy?: HealthcareUnitOrderBy = HealthcareUnitOrderBy.NAME;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
