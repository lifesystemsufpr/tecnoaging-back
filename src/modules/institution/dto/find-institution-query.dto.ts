import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum InstitutionSortField {
  TITLE = 'title',
  CREATED_AT = 'createdAt',
}

export class FindInstitutionsQueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrar por título' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: 'Filtrar por status ativo/inativo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    required: false,
    enum: InstitutionSortField,
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
