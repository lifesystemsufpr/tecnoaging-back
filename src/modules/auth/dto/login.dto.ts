import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { cleanCpf } from 'src/shared/functions/cpf';

export class LoginDto {
  @ApiProperty()
  @IsString({ message: 'O CPF deve ser um texto.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? cleanCpf(value) : value,
  )
  cpf: string;

  @ApiProperty()
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password: string;

  @ApiProperty({
    description: 'Marcar para manter o usuário logado por 7 dias',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  keepMeLoggedIn?: boolean;
}
