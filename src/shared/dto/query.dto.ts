import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

export class QueryDto extends PaginationDto {
  @ApiProperty({ required: false, description: 'Busca textual genérica' })
  @IsOptional()
  @IsString()
  search?: string;
}
