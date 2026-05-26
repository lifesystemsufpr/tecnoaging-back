import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Request } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const path =
      (httpAdapter.getRequestUrl(request) as string | undefined) ??
      request.url ??
      '';
    const isProd = process.env.NODE_ENV === 'production';

    const body = this.toBody(exception, path, isProd);

    this.log(exception, body, request);

    httpAdapter.reply(ctx.getResponse(), body, body.statusCode);
  }

  private toBody(exception: unknown, path: string, isProd: boolean): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const base = this.baseEnvelope(status, path, timestamp);

      if (typeof res === 'string') {
        return { ...base, message: res };
      }

      const merged: Record<string, unknown> = {
        ...base,
        ...(res as Record<string, unknown>),
      };
      merged.statusCode = status;
      merged.error = (merged.error as string | undefined) ?? base.error;
      merged.timestamp = timestamp;
      merged.path = path;
      if (!('message' in merged) || merged.message === undefined) {
        merged.message = base.error;
      }
      return merged as ErrorBody;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaKnown(exception, path, timestamp);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        ...this.baseEnvelope(HttpStatus.BAD_REQUEST, path, timestamp),
        message: 'Invalid database query parameters.',
        details: { code: 'PRISMA_VALIDATION' },
      };
    }

    if (exception instanceof TokenExpiredError) {
      return {
        ...this.baseEnvelope(HttpStatus.UNAUTHORIZED, path, timestamp),
        message: 'Token expired',
        details: { code: 'TOKEN_EXPIRED' },
      };
    }

    if (exception instanceof JsonWebTokenError) {
      return {
        ...this.baseEnvelope(HttpStatus.UNAUTHORIZED, path, timestamp),
        message: 'Invalid token',
        details: { code: 'INVALID_TOKEN' },
      };
    }

    const body: ErrorBody = {
      ...this.baseEnvelope(HttpStatus.INTERNAL_SERVER_ERROR, path, timestamp),
      message: 'Internal server error',
    };

    if (!isProd && exception instanceof Error) {
      body.details = {
        original: exception.name,
        stack: exception.stack,
        message: exception.message,
      };
    }

    return body;
  }

  private fromPrismaKnown(
    exception: Prisma.PrismaClientKnownRequestError,
    path: string,
    timestamp: string,
  ): ErrorBody {
    const target = (exception.meta?.target ?? null) as string | string[] | null;
    const targetText = Array.isArray(target) ? target.join(', ') : target;

    switch (exception.code) {
      case 'P2002': {
        const message = targetText
          ? `Unique constraint failed on the fields: ${targetText}`
          : 'Unique constraint failed';
        return {
          ...this.baseEnvelope(HttpStatus.CONFLICT, path, timestamp),
          message,
          details: { code: 'P2002', target },
        };
      }
      case 'P2003':
        return {
          ...this.baseEnvelope(HttpStatus.CONFLICT, path, timestamp),
          message: 'Foreign key constraint failed.',
          details: { code: 'P2003', target },
        };
      case 'P2025':
        return {
          ...this.baseEnvelope(HttpStatus.NOT_FOUND, path, timestamp),
          message: 'Record not found',
          details: { code: 'P2025' },
        };
      case 'P2000':
        return {
          ...this.baseEnvelope(HttpStatus.BAD_REQUEST, path, timestamp),
          message: 'Value too long for column.',
          details: { code: 'P2000' },
        };
      default:
        return {
          ...this.baseEnvelope(HttpStatus.BAD_REQUEST, path, timestamp),
          message: 'Database request error.',
          details: { code: exception.code },
        };
    }
  }

  private baseEnvelope(
    status: number,
    path: string,
    timestamp: string,
  ): ErrorBody {
    return {
      statusCode: status,
      message: STATUS_TEXT[status] ?? 'Error',
      error: STATUS_TEXT[status] ?? 'Error',
      timestamp,
      path,
    };
  }

  private log(exception: unknown, body: ErrorBody, request: Request): void {
    const meta = `${request.method} ${body.path} ${body.statusCode}`;
    const name =
      exception instanceof Error ? exception.constructor.name : 'Unknown';

    if (body.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${meta} — ${name}`, stack);
      return;
    }

    this.logger.warn(`${meta} — ${name}`);
  }
}
