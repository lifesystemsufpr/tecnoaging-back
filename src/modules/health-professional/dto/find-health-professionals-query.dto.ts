import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum HealthProfessionalSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
  EMAIL = 'email',
  SPECIALITY = 'speciality',
  CREATED_AT = 'createdAt',
}

export class FindHealthProfessionalsQueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrar por CPF' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({ required: false, description: 'Filtrar por nome completo' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, description: 'Filtrar por e-mail' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, description: 'Filtrar por especialidade' })
  @IsOptional()
  @IsString()
  speciality?: string;

  @ApiProperty({ required: false, enum: Gender, description: 'Filtrar por gênero' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    required: false,
    enum: HealthProfessionalSortField,
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
