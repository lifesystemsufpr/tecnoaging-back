import { ApiProperty } from '@nestjs/swagger';
import { Gender, SystemRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { cleanCpf } from 'src/shared/functions/cpf';
import { IsCpf } from 'src/shared/validators/is-cpf.decorator';
import { IsFullName } from 'src/shared/validators/is-full-name.decorator';

export class CreateUserDto {
  @ApiProperty({
    description:
      "User's CPF, must contain exactly 11 digits without punctuation.",
    example: '12345678901',
  })
  @IsString({ message: 'O CPF deve ser um texto.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? cleanCpf(value) : value,
  )
  @IsCpf()
  cpf: string;

  @ApiProperty({
    description: "User's full name.",
    example: 'Maria da Silva',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome completo é obrigatório.' })
  @IsFullName()
  fullName: string;

  @ApiProperty({
    description: "User's phone number (optional).",
    example: '41999998888',
    required: false,
  })
  @IsString({ message: 'O telefone deve ser um texto.' })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: "User's gender.",
    enum: Gender,
    example: 'FEMALE',
  })
  @IsEnum(Gender, { message: 'O sexo informado é inválido.' })
  @IsNotEmpty({ message: 'O sexo é obrigatório.' })
  gender: Gender;

  @ApiProperty({
    description: "User's role in the system.",
    enum: SystemRole,
    example: 'PARTICIPANT',
  })
  @IsEnum(SystemRole, { message: 'O perfil informado é inválido.' })
  @IsNotEmpty({ message: 'O perfil é obrigatório.' })
  role: SystemRole;

  @ApiProperty({
    description: 'User password (must be at least 6 characters).',
    example: 'MyS3cureP@ss!',
    minLength: 6,
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'O campo active precisa ser um valor booleano (true ou false)',
    example: 'true',
  })
  @IsBoolean({
    message: 'O campo active precisa ser um valor booleano (true ou false).',
  })
  @IsOptional()
  active?;
}
