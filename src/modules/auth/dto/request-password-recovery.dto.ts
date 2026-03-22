import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestPasswordRecoveryDto {
  @ApiProperty({
    description: 'Email address for password recovery',
    example: 'researcher@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
