import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CreateUserDto } from '../../users/dtos/create-user.dto';

export class CreateHealthProfessionalUserDto extends OmitType(CreateUserDto, [
  'role',
]) {}

export class CreateHealthProfessionalDto {
  @ValidateNested()
  @Type(() => CreateHealthProfessionalUserDto)
  user: CreateHealthProfessionalUserDto;

  @ApiProperty({
    description: 'The speciality of the health professional',
    example: 'Cardiologista',
  })
  @IsNotEmpty()
  @IsString()
  speciality: string;

  @ApiProperty({
    description: 'The email of the health professional',
    example: 'joao.silva@example.com',
  })
  @IsNotEmpty()
  @IsString()
  email: string;
}
