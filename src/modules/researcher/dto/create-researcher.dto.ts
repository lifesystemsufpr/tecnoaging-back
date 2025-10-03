import { ValidateNested, IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { CreateUserDto } from 'src/modules/users/dtos/create-user.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
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
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'The field of study of the researcher',
    example: 'Gerontologia',
  })
  @IsNotEmpty()
  @IsString()
  fieldOfStudy: string;

  @ApiProperty({
    description: 'The ID of the institution the researcher is affiliated with',
    example: 'a1b2c3d4-e5f6-7g8h-9i10-j11k12l13m14',
  })
  @IsNotEmpty()
  @IsUUID()
  institutionId: string;
}
