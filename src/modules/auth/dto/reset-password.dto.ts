import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received in email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newSecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  newPassword: string;
}
