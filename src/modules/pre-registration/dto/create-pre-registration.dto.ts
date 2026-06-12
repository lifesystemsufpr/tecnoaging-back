import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  Matches,
  MaxDate,
} from 'class-validator';

export class CreatePreRegistrationDto {
  @ApiProperty({
    description: "Participant's CPF (11 digits, no punctuation).",
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'O CPF deve conter exatamente 11 dígitos numéricos.' })
  cpf: string;

  @ApiProperty({
    description: "Participant's full name.",
    example: 'Maria da Silva',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: 'Date of birth of the participant.',
    example: '1945-12-31',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @MaxDate(() => new Date(), {
    message: 'A data de nascimento não pode ser uma data futura.',
  })
  birthday: Date;
}
