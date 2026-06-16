import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';
import { IsSafeText } from 'src/shared/validators/is-safe-text.decorator';

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
  @IsNotEmpty({ message: 'A especialidade é obrigatória.' })
  @IsString({ message: 'A especialidade deve ser um texto.' })
  @IsSafeText({
    message:
      'A especialidade contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  speciality: string;

  @ApiProperty({
    description: 'The email of the health professional',
    example: 'joao.silva@example.com',
  })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'O e-mail informado é inválido.' })
  email: string;
}
