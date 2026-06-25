import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsSafeText } from 'src/shared/validators/is-safe-text.decorator';

export class CreateHealthUnitDto {
  @ApiProperty({
    description: 'The name of the health unit',
    example: 'Unidade de Saúde Central',
  })
  @IsNotEmpty({ message: 'O nome da unidade de saúde é obrigatório.' })
  @IsString({ message: 'O nome da unidade de saúde deve ser um texto.' })
  @IsSafeText({
    message:
      'O nome da unidade de saúde contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  name: string;

  @ApiProperty({
    description: 'The zip code of the health unit',
    example: '80010-000',
  })
  @IsNotEmpty({ message: 'O CEP é obrigatório.' })
  @IsString({ message: 'O CEP deve ser um texto.' })
  zipCode: string;

  @ApiProperty({
    description: 'The street address of the health unit',
    example: 'Avenida Brasil',
  })
  @IsNotEmpty({ message: 'O logradouro é obrigatório.' })
  @IsString({ message: 'O logradouro deve ser um texto.' })
  @IsSafeText({
    message:
      'O logradouro contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  street: string;

  @ApiProperty({
    description: 'The number of the health unit',
    example: '123',
  })
  @IsNotEmpty({ message: 'O número é obrigatório.' })
  @IsString({ message: 'O número deve ser um texto.' })
  number: string;

  @ApiProperty({
    description: 'The complement of the health unit',
    example: 'Bloco A',
  })
  @IsString({ message: 'O complemento deve ser um texto.' })
  complement: string;

  @ApiProperty({
    description: 'The city of the health unit',
    example: 'Curitiba',
  })
  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  @IsString({ message: 'A cidade deve ser um texto.' })
  @IsSafeText({
    message:
      'A cidade contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  city: string;

  @ApiProperty({
    description: 'The neighborhood of the health unit',
    example: 'Centro',
  })
  @IsNotEmpty({ message: 'O bairro é obrigatório.' })
  @IsString({ message: 'O bairro deve ser um texto.' })
  @IsSafeText({
    message:
      'O bairro contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  neighborhood: string;

  @ApiProperty({
    description: 'The state of the health unit',
    example: 'Paraná',
  })
  @IsNotEmpty({ message: 'O estado é obrigatório.' })
  @IsString({ message: 'O estado deve ser um texto.' })
  @IsSafeText({
    message:
      'O estado contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  state: string;

  @IsOptional()
  @IsBoolean({
    message: 'O campo active precisa ser um valor booleano (true ou false).',
  })
  active?: boolean;
}
