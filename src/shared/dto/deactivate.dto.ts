import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeactivateDto {
  @ApiPropertyOptional({ description: 'Motivo da desativação' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
