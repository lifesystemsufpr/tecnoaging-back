import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, Scholarship, SocialEconomicLevel } from '@prisma/client';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum ParticipantSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
  BIRTHDAY = 'birthday',
  CITY = 'city',
  STATE = 'state',
  NEIGHBORHOOD = 'neighborhood',
  SCHOLARSHIP = 'scholarship',
  CREATED_AT = 'createdAt',
}

export class FindParticipantsQueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Filtrar por CPF' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({ required: false, description: 'Filtrar por nome completo' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, enum: Gender, description: 'Filtrar por gênero' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

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

  @ApiProperty({ required: false, enum: Scholarship, description: 'Filtrar por escolaridade' })
  @IsOptional()
  @IsEnum(Scholarship)
  scholarship?: Scholarship;

  @ApiProperty({
    required: false,
    enum: SocialEconomicLevel,
    description: 'Filtrar por nível socioeconômico',
  })
  @IsOptional()
  @IsEnum(SocialEconomicLevel)
  socioEconomicLevel?: SocialEconomicLevel;

  @ApiProperty({
    required: false,
    enum: ParticipantSortField,
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
