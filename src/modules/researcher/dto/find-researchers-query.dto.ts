import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum ResearcherSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
  EMAIL = 'email',
  FIELD_OF_STUDY = 'fieldOfStudy',
  INSTITUTION_NAME = 'institutionName',
  CREATED_AT = 'createdAt',
}

export class FindResearchersQueryDto extends PaginationDto {
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

  @ApiProperty({ required: false, description: 'Filtrar por área de estudo' })
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiProperty({ required: false, enum: Gender, description: 'Filtrar por gênero' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false, description: 'Filtrar por ID da instituição' })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiProperty({
    required: false,
    enum: ResearcherSortField,
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
