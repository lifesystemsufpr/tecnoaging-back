import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString, MaxDate } from 'class-validator';
import { cleanCpf } from 'src/shared/functions/cpf';
import { IsCpf } from 'src/shared/validators/is-cpf.decorator';
import { IsFullName } from 'src/shared/validators/is-full-name.decorator';

export class CreatePreRegistrationDto {
  @ApiProperty({
    description: "Participant's CPF (11 digits, no punctuation).",
    example: '12345678901',
  })
  @IsString({ message: 'O CPF deve ser um texto.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? cleanCpf(value) : value,
  )
  @IsCpf()
  cpf: string;

  @ApiProperty({
    description: "Participant's full name.",
    example: 'Maria da Silva',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome completo é obrigatório.' })
  @IsFullName()
  fullName: string;

  @ApiProperty({
    description: 'Date of birth of the participant.',
    example: '1945-12-31',
  })
  @IsNotEmpty({ message: 'A data de nascimento é obrigatória.' })
  @IsDate({ message: 'A data de nascimento é inválida.' })
  @Type(() => Date)
  @MaxDate(() => new Date(), {
    message: 'A data de nascimento não pode ser uma data futura.',
  })
  birthday: Date;
}
