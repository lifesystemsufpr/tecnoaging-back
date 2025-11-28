import { CreatePatientDto } from './create-patient.dto';
import { UpdateUserDto } from 'src/modules/users/dtos/update-user.dto';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/swagger';

class PatientDataOnlyDto extends OmitType(CreatePatientDto, [
  'user',
] as const) {}

export class UpdatePatientDto extends PartialType(PatientDataOnlyDto) {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserDto)
  user?: UpdateUserDto;
}
