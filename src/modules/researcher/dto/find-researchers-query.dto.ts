import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum ResearcherSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
  CREATED_AT = 'createdAt',
  INSTITUTION_NAME = 'institutionName',
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

  @ApiProperty({ required: false, description: 'Filtrar por ID da instituição' })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiProperty({
    required: false,
    enum: ResearcherSortField,
    description: 'Campo para ordenação',
  })
  @IsOptional()
  @IsEnum(ResearcherSortField)
  sortField?: ResearcherSortField;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Direção da ordenação',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
