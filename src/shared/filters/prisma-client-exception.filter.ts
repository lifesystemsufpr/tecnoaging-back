import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Ocorreu um erro interno no servidor.';
    let errorType = 'InternalServerError';

    switch (exception.code) {
      case 'P2002': {
        statusCode = HttpStatus.CONFLICT;
        const field = (exception.meta?.target as string[])?.[0] || 'campo';
        errorMessage = `Já existe um registro com este ${field}.`;
        errorType = 'Conflict';
        break;
      }
      case 'P2025': {
        statusCode = HttpStatus.NOT_FOUND;
        errorMessage = 'O recurso solicitado não foi encontrado.';
        errorType = 'NotFound';
        break;
      }
      case 'P2003': {
        statusCode = HttpStatus.CONFLICT;
        errorMessage =
          'A operação não pode ser concluída devido a uma dependência de outro registro.';
        errorType = 'DependencyConflict';
        break;
      }
      default: {
        console.error(
          `Código de erro do Prisma não tratado: ${exception.code}`,
          exception,
        );
        break;
      }
    }

    response.status(statusCode).json({
      statusCode: statusCode,
      message: errorMessage,
      error: errorType,
      timestamp: new Date().toISOString(),
    });
  }
}
