import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Scholarship, SocialEconomicLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';

export class CreatePatientUserDto extends OmitType(CreateUserDto, [
  'role',
  'password',
]) {}

export class CreatePatientDto {
  @ValidateNested()
  @Type(() => CreatePatientUserDto)
  user: CreatePatientUserDto;

  @ApiProperty({
    description: 'Date of birth of the patient',
    example: '1945-12-31',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  birthday: Date;

  @ApiProperty({
    description: 'The scholarship status of the patient',
    example: 'HIGHER_EDUCATION_COMPLETE',
  })
  @IsNotEmpty()
  @IsEnum(Scholarship)
  scholarship: Scholarship;

  @ApiProperty({
    description: 'The socio-economic level of the patient',
    example: 'C',
  })
  @IsNotEmpty()
  @IsEnum(SocialEconomicLevel)
  socio_economic_level: SocialEconomicLevel;

  @ApiProperty({
    description: 'The weight of the patient',
    example: 70,
  })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({
    description: 'The height of the patient',
    example: 1.75,
  })
  @IsNotEmpty()
  @IsNumber()
  height: number;

  @ApiProperty({
    description: 'The zip code of the patient',
    example: '12345-678',
  })
  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @ApiProperty({
    description: 'The street address of the patient',
    example: '123 Main St',
  })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({
    description: 'The street number of the patient',
    example: '456',
  })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiProperty({
    description: 'The complement of the address of the patient',
    example: 'Apt 789',
  })
  @IsString()
  complement: string;

  @ApiProperty({
    description: 'The neighborhood of the patient',
    example: 'Centro',
  })
  @IsNotEmpty()
  @IsString()
  neighborhood: string;

  @ApiProperty({
    description: 'The city of the patient',
    example: 'Curitiba',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'The state of the patient',
    example: 'PR',
  })
  @IsNotEmpty()
  @IsString()
  state: string;
}
