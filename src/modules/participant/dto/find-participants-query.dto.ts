import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export enum ParticipantSortField {
  FULL_NAME = 'fullName',
  CPF = 'cpf',
  BIRTHDAY = 'birthday',
  CITY = 'city',
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

  @ApiProperty({ required: false, description: 'Filtrar por cidade' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'Filtrar por estado (UF)' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    required: false,
    enum: ParticipantSortField,
    description: 'Campo para ordenação',
  })
  @IsOptional()
  @IsEnum(ParticipantSortField)
  sortField?: ParticipantSortField;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'Direção da ordenação',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';
}
