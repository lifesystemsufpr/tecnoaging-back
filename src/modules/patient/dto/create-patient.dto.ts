import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Scholarship, SocialEconomicLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxDate,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';

export class CreateParticipantUserDto extends OmitType(CreateUserDto, [
  'role',
  'password',
]) {}

export class CreateParticipantDto {
  @ValidateNested()
  @Type(() => CreateParticipantUserDto)
  user: CreateParticipantUserDto;

  @ApiProperty({
    description: 'Date of birth of the participant',
    example: '1945-12-31',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @MaxDate(new Date(), {
    message: 'A data de nascimento não pode ser uma data futura.',
  })
  birthday: Date;

  @ApiProperty({
    description: 'The scholarship status of the participant',
    example: 'HIGHER_EDUCATION_COMPLETE',
  })
  @IsNotEmpty()
  @IsEnum(Scholarship)
  scholarship: Scholarship;

  @ApiProperty({
    description: 'The socio-economic level of the participant',
    example: 'C',
  })
  @IsNotEmpty()
  @IsEnum(SocialEconomicLevel)
  socio_economic_level: SocialEconomicLevel;

  @ApiProperty({
    description: 'The weight of the participant',
    example: 70,
  })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({
    description: 'The height of the participant',
    example: 1.75,
  })
  @IsNotEmpty()
  @IsNumber()
  height: number;

  @ApiProperty({
    description: 'The zip code of the participant',
    example: '12345-678',
  })
  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @ApiProperty({
    description: 'The street address of the participant',
    example: '123 Main St',
  })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({
    description: 'The street number of the participant',
    example: '456',
  })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiProperty({
    description: 'The complement of the address of the participant',
    example: 'Apt 789',
  })
  @IsString()
  complement: string;

  @ApiProperty({
    description: 'The neighborhood of the participant',
    example: 'Centro',
  })
  @IsNotEmpty()
  @IsString()
  neighborhood: string;

  @ApiProperty({
    description: 'The city of the participant',
    example: 'Curitiba',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'The state of the participant',
    example: 'PR',
  })
  @IsNotEmpty()
  @IsString()
  state: string;
}
