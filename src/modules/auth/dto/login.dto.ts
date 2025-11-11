import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Marcar para manter o usuário logado por 7 dias',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  keepMeLoggedIn?: boolean;
}
