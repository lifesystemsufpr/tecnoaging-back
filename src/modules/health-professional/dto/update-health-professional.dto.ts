import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateHealthProfessionalDto } from './create-health-professional.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateUserDto } from '../../users/dtos/update-user.dto';

class HealthProfessionalDataOnly extends OmitType(CreateHealthProfessionalDto, [
  'user',
] as const) {}
export class UpdateHealthProfessionalDto extends PartialType(
  HealthProfessionalDataOnly,
) {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserDto)
  user?: UpdateUserDto;
}
