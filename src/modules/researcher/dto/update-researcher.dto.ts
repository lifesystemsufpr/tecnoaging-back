import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateResearcherDto } from './create-researcher.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateUserDto } from 'src/modules/users/dtos/update-user.dto';

class ResearcherDataOnlyDto extends OmitType(CreateResearcherDto, [
  'user',
] as const) {}

export class UpdateResearcherDto extends PartialType(ResearcherDataOnlyDto) {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserDto)
  user?: UpdateUserDto;
}
