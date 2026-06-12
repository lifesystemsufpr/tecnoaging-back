import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface ReplyCall {
  body: Record<string, unknown>;
  status: number;
}

function buildHost(method = 'GET', url = '/backend/test'): {
  host: ArgumentsHost;
  reply: ReplyCall | null;
  hostMock: {
    httpAdapter: {
      reply: jest.Mock;
      getRequestUrl: jest.Mock;
    };
  };
} {
  const captured: { value: ReplyCall | null } = { value: null };
  const httpAdapter = {
    reply: jest.fn((_res: unknown, body: Record<string, unknown>, status: number) => {
      captured.value = { body, status };
    }),
    getRequestUrl: jest.fn(() => url),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return {
    host,
    get reply() {
      return captured.value;
    },
    hostMock: { httpAdapter },
  } as unknown as {
    host: ArgumentsHost;
    reply: ReplyCall | null;
    hostMock: { httpAdapter: { reply: jest.Mock; getRequestUrl: jest.Mock } };
  };
}

function makeFilter(httpAdapter: unknown): AllExceptionsFilter {
  const host: HttpAdapterHost = { httpAdapter } as HttpAdapterHost;
  return new AllExceptionsFilter(host);
}

describe('AllExceptionsFilter', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('handles HttpException with string response', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(new NotFoundException('Recurso ausente'), ctx.host);

    expect(ctx.reply?.status).toBe(404);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 404,
      message: 'Recurso ausente',
      error: 'Not Found',
      path: '/backend/test',
    });
    expect(ctx.reply?.body.timestamp).toEqual(expect.any(String));
  });

  it('preserves auth debug_error at root from HttpException object response', () => {
    const ctx = buildHost('POST', '/backend/auth/login');
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(
      new UnauthorizedException({
        debug_error: 'USUÁRIO_NAO_ENCONTRADO',
        message: 'Credenciais inválidas',
      }),
      ctx.host,
    );

    expect(ctx.reply?.status).toBe(401);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 401,
      message: 'Credenciais inválidas',
      error: 'Unauthorized',
      debug_error: 'USUÁRIO_NAO_ENCONTRADO',
      path: '/backend/auth/login',
    });
  });

  it('keeps validation message array and details.fields from BadRequestException', () => {
    const ctx = buildHost('POST', '/backend/users');
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(
      new BadRequestException({
        message: ['cpf must be a string', 'name should not be empty'],
        details: {
          fields: [
            { field: 'cpf', constraints: { isString: 'cpf must be a string' } },
            {
              field: 'name',
              constraints: { isNotEmpty: 'name should not be empty' },
            },
          ],
        },
      }),
      ctx.host,
    );

    expect(ctx.reply?.status).toBe(400);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: ['cpf must be a string', 'name should not be empty'],
      details: { fields: expect.any(Array) },
    });
  });

  it('maps Prisma P2002 to 409 with details.code', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);
    const exc = new Prisma.PrismaClientKnownRequestError(
      'unique fail',
      { code: 'P2002', clientVersion: '5.x', meta: { target: ['cpf'] } },
    );

    filter.catch(exc, ctx.host);

    expect(ctx.reply?.status).toBe(409);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'Já existe um cadastro com este CPF.',
      details: { code: 'P2002', target: ['cpf'] },
    });
  });

  it('maps Prisma P2025 to 404', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);
    const exc = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '5.x',
    });

    filter.catch(exc, ctx.host);

    expect(ctx.reply?.status).toBe(404);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      details: { code: 'P2025' },
    });
  });

  it('maps Prisma P2003 (FK) to 409', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);
    const exc = new Prisma.PrismaClientKnownRequestError('fk fail', {
      code: 'P2003',
      clientVersion: '5.x',
      meta: { target: 'evaluation_participantId_fkey' },
    });

    filter.catch(exc, ctx.host);

    expect(ctx.reply?.status).toBe(409);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 409,
      details: { code: 'P2003' },
    });
  });

  it('maps TokenExpiredError to 401', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(new TokenExpiredError('jwt expired', new Date()), ctx.host);

    expect(ctx.reply?.status).toBe(401);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 401,
      message: 'Sessão expirada. Faça login novamente.',
      details: { code: 'TOKEN_EXPIRED' },
    });
  });

  it('maps JsonWebTokenError to 401', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(new JsonWebTokenError('invalid signature'), ctx.host);

    expect(ctx.reply?.status).toBe(401);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 401,
      details: { code: 'INVALID_TOKEN' },
    });
  });

  it('hides internal details on raw Error in production', () => {
    process.env.NODE_ENV = 'production';
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(new Error('boom'), ctx.host);

    expect(ctx.reply?.status).toBe(500);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 500,
      message: 'Erro interno do servidor.',
      error: 'Internal Server Error',
    });
    expect(ctx.reply?.body.details).toBeUndefined();
  });

  it('exposes details on raw Error in development', () => {
    process.env.NODE_ENV = 'development';
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(new Error('boom'), ctx.host);

    expect(ctx.reply?.status).toBe(500);
    expect(ctx.reply?.body.details).toMatchObject({
      original: 'Error',
      message: 'boom',
    });
  });

  it('handles ForbiddenException with object response', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(
      new ForbiddenException({
        debug_error: 'USUARIO_INATIVO',
        message: 'Conta desativada',
      }),
      ctx.host,
    );

    expect(ctx.reply?.status).toBe(403);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      debug_error: 'USUARIO_INATIVO',
      message: 'Conta desativada',
    });
  });

  it('falls through HttpException subclasses with custom status', () => {
    const ctx = buildHost();
    const filter = makeFilter(ctx.hostMock.httpAdapter);

    filter.catch(new HttpException('Teapot', 418), ctx.host);

    expect(ctx.reply?.status).toBe(418);
    expect(ctx.reply?.body).toMatchObject({
      statusCode: 418,
      message: 'Teapot',
    });
  });
});
