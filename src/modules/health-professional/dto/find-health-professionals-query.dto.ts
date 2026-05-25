import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum HealthProfessionalSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
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

  @ApiProperty({ required: false, description: 'Filtrar por especialidade' })
  @IsOptional()
  @IsString()
  speciality?: string;

  @ApiProperty({
    required: false,
    enum: HealthProfessionalSortField,
    description: 'Campo para ordenação',
  })
  @IsOptional()
  @IsEnum(HealthProfessionalSortField)
  sortField?: HealthProfessionalSortField;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Direção da ordenação',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
