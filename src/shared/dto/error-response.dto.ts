import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Credenciais inválidas' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['cpf must be a string'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: '2026-05-06T12:34:56.789Z' })
  timestamp!: string;

  @ApiProperty({ example: '/backend/auth/login' })
  path!: string;

  @ApiPropertyOptional({
    description:
      'Structured details. May contain `code` (Prisma/JWT error code), `fields` (validation breakdown).',
    example: { code: 'P2002', target: ['cpf'] },
  })
  details?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Programmatic auth error code. Present only on auth-related errors.',
    example: 'USUÁRIO_NAO_ENCONTRADO',
  })
  debug_error?: string;
}
