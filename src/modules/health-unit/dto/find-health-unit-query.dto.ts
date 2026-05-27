import { IsOptional, IsString, IsBoolean, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum HealthcareUnitSortField {
  NAME = 'name',
  CITY = 'city',
  STATE = 'state',
  NEIGHBORHOOD = 'neighborhood',
  ZIP_CODE = 'zipCode',
  CREATED_AT = 'createdAt',
}

export class FindHealthcareUnitsQueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrar por nome da unidade' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Filtrar por cidade' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'Filtrar por estado (UF)' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false, description: 'Filtrar por bairro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ required: false, description: 'Filtrar por CEP' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false, description: 'Filtrar por status ativo/inativo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

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
    enum: HealthcareUnitSortField,
    description: 'Campo para ordenação. Valores inválidos são ignorados.',
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
  sortDirection?: 'asc' | 'desc' = 'asc';
}
