import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateInstitutionDto {
  @ApiProperty({
    description: 'The title of the institution',
    example: 'Universidade Federal do Paraná',
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
