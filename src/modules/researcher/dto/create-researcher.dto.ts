import {
  ValidateNested,
  IsEmail,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { IsSafeText } from 'src/shared/validators/is-safe-text.decorator';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Create a specific DTO for user creation in researcher context
export class CreateResearcherUserDto extends OmitType(CreateUserDto, [
  'role',
]) {}

export class CreateResearcherDto {
  @ValidateNested()
  @Type(() => CreateResearcherUserDto)
  user: CreateResearcherUserDto;

  @ApiProperty({
    description: 'The email of the researcher',
    example: 'joao.silva@example.com',
  })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'O e-mail informado é inválido.' })
  email: string;

  @ApiProperty({
    description: 'The field of study of the researcher',
    example: 'Gerontologia',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A área de estudo deve ser um texto.' })
  @IsSafeText({
    message:
      'A área de estudo contém caracteres inválidos. Use apenas letras, números, espaços e pontuação comum.',
  })
  fieldOfStudy?: string;

  @ApiProperty({
    description: 'The ID of the institution the researcher is affiliated with',
    example: 'a1b2c3d4-e5f6-7g8h-9i10-j11k12l13m14',
  })
  @IsNotEmpty({ message: 'A instituição é obrigatória.' })
  @IsUUID(undefined, { message: 'A instituição informada é inválida.' })
  institutionId: string;
}
