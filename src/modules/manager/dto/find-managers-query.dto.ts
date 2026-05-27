import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum ManagerSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
  CREATED_AT = 'createdAt',
}

export class FindManagersQueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrar por CPF' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({ required: false, description: 'Filtrar por nome completo' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, description: 'Filtrar por telefone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, enum: Gender, description: 'Filtrar por gênero' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false, description: 'Filtrar por status ativo/inativo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    required: false,
    enum: ManagerSortField,
    description: 'Campo para ordenação. Valores inválidos são ignorados.',
  })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'], description: 'Direção da ordenação' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'asc';
}
