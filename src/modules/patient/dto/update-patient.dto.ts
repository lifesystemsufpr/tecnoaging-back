import { CreateParticipantDto } from './create-participant.dto';
import { UpdateUserDto } from 'src/modules/users/dtos/update-user.dto';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/swagger';

class ParticipantDataOnlyDto extends OmitType(CreateParticipantDto, [
  'user',
] as const) {}

export class UpdateParticipantDto extends PartialType(ParticipantDataOnlyDto) {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserDto)
  user?: UpdateUserDto;
}
