import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsSafeText } from 'src/shared/validators/is-safe-text.decorator';

export class CreateInstitutionDto {
  @ApiProperty({
    description: 'The title of the institution',
    example: 'Universidade Federal do Paraná',
  })
  @IsString({ message: 'O nome da instituição deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da instituição é obrigatório.' })
  @IsSafeText({
    message:
      'O nome da instituição contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  title: string;
}
