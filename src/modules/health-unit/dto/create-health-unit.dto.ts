import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateHealthUnitDto {
  @ApiProperty({
    description: 'The name of the health unit',
    example: 'Unidade de Saúde Central',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The zip code of the health unit',
    example: '80010-000',
  })
  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @ApiProperty({
    description: 'The street address of the health unit',
    example: 'Avenida Brasil',
  })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({
    description: 'The number of the health unit',
    example: '123',
  })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiProperty({
    description: 'The complement of the health unit',
    example: 'Bloco A',
  })
  @IsString()
  complement: string;

  @ApiProperty({
    description: 'The city of the health unit',
    example: 'Curitiba',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'The neighborhood of the health unit',
    example: 'Centro',
  })
  @IsNotEmpty()
  @IsString()
  neighborhood: string;

  @ApiProperty({
    description: 'The state of the health unit',
    example: 'Paraná',
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;
}
