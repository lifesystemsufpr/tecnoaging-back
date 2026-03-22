import { Gender } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for returning the Administrator's profile information.
 * Contains only the fields that should be exposed when viewing profile details.
 * Sensitive information (like password) is intentionally excluded.
 */
export class ManagerProfileDto {
  @ApiProperty({
    description: "Administrator's unique CPF identifier",
    example: '12345678901',
  })
  id: string;

  @ApiProperty({
    description: "Administrator's CPF (read-only)",
    example: '12345678901',
  })
  cpf: string;

  @ApiProperty({
    description: "Administrator's full name",
    example: 'Maria da Silva',
  })
  fullName: string;

  @ApiProperty({
    description: "Administrator's gender",
    enum: Gender,
    example: 'FEMALE',
  })
  gender: Gender;

  @ApiProperty({
    description: "Administrator's phone number (optional)",
    example: '41999998888',
    nullable: true,
  })
  phone?: string | null;

  @ApiProperty({
    description: 'Whether the administrator account is active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Profile creation timestamp',
    example: '2026-03-18T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Profile last update timestamp',
    example: '2026-03-18T10:30:00Z',
  })
  updatedAt: Date;
}
