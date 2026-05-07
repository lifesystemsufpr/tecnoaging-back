import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Module,
  NotFoundException,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { IsString, MinLength } from 'class-validator';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../src/shared/filters/all-exceptions.filter';

class LoginInput {
  @IsString()
  @MinLength(11)
  cpf!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

interface FlatField {
  field: string;
  constraints: Record<string, string>;
}

function flatten(errors: ValidationError[], parent = ''): FlatField[] {
  const out: FlatField[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      out.push({ field, constraints: err.constraints });
    }
    if (err.children?.length) {
      out.push(...flatten(err.children, field));
    }
  }
  return out;
}

@Controller('errors')
class ErrorContractController {
  @Post('validate')
  validate(@Body() _body: LoginInput) {
    return { ok: true };
  }

  @Get('not-found')
  notFound() {
    throw new NotFoundException('Recurso ausente');
  }

  @Get('unauth-string')
  unauthString() {
    throw new UnauthorizedException('Sem token');
  }

  @Get('unauth-object')
  unauthObject() {
    throw new UnauthorizedException({
      debug_error: 'USUÁRIO_NAO_ENCONTRADO',
      message: 'Credenciais inválidas',
    });
  }

  @Get('forbidden')
  forbidden() {
    throw new ForbiddenException({
      debug_error: 'USUARIO_INATIVO',
      message: 'Conta desativada',
    });
  }

  @Get('conflict-prisma')
  conflictPrisma() {
    throw new Prisma.PrismaClientKnownRequestError('unique fail', {
      code: 'P2002',
      clientVersion: '5.x',
      meta: { target: ['cpf'] },
    });
  }

  @Get('not-found-prisma')
  notFoundPrisma() {
    throw new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '5.x',
    });
  }

  @Get('jwt-expired')
  jwtExpired() {
    throw new TokenExpiredError('jwt expired', new Date());
  }

  @Get('jwt-invalid')
  jwtInvalid() {
    throw new JsonWebTokenError('invalid');
  }

  @Get('teapot')
  teapot() {
    throw new HttpException('Teapot', 418);
  }

  @Get('unavailable')
  unavailable() {
    throw new ServiceUnavailableException('Python service offline');
  }

  @Get('boom')
  boom() {
    throw new Error('boom');
  }
}

@Module({
  controllers: [ErrorContractController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
class ErrorContractModule {}

describe('Error contract (e2e)', () => {
  let app: App;
  let nestApp: Awaited<ReturnType<typeof NestFactory.create>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ErrorContractModule],
    }).compile();

    nestApp = moduleRef.createNestApplication();
    nestApp.setGlobalPrefix('backend');
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
          const fields = flatten(errors);
          const messages = fields.flatMap((f) =>
            Object.values(f.constraints ?? {}),
          );
          return new BadRequestException({
            message: messages,
            details: { fields },
          });
        },
      }),
    );
    // ensure filter has access to HttpAdapterHost; APP_FILTER picks it up via DI
    nestApp.get(HttpAdapterHost);
    await nestApp.init();
    app = nestApp.getHttpServer();
  });

  afterAll(async () => {
    await nestApp.close();
  });

  function expectEnvelope(body: Record<string, unknown>, status: number) {
    expect(body).toMatchObject({
      statusCode: status,
      error: expect.any(String),
      timestamp: expect.any(String),
      path: expect.any(String),
    });
    expect(body.message).toBeDefined();
  }

  it('400 validation: message is array, details.fields populated', async () => {
    const res = await request(app)
      .post('/backend/errors/validate')
      .send({ cpf: 'x', password: '1' });

    expect(res.status).toBe(400);
    expectEnvelope(res.body, 400);
    expect(Array.isArray(res.body.message)).toBe(true);
    expect(res.body.details.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'cpf' }),
        expect.objectContaining({ field: 'password' }),
      ]),
    );
  });

  it('404 not found', async () => {
    const res = await request(app).get('/backend/errors/not-found');
    expect(res.status).toBe(404);
    expectEnvelope(res.body, 404);
    expect(res.body.message).toBe('Recurso ausente');
    expect(res.body.error).toBe('Not Found');
  });

  it('401 unauthorized with string', async () => {
    const res = await request(app).get('/backend/errors/unauth-string');
    expect(res.status).toBe(401);
    expectEnvelope(res.body, 401);
    expect(res.body.message).toBe('Sem token');
  });

  it('401 unauthorized preserves debug_error at root', async () => {
    const res = await request(app).get('/backend/errors/unauth-object');
    expect(res.status).toBe(401);
    expectEnvelope(res.body, 401);
    expect(res.body.debug_error).toBe('USUÁRIO_NAO_ENCONTRADO');
    expect(res.body.message).toBe('Credenciais inválidas');
  });

  it('403 forbidden preserves debug_error at root', async () => {
    const res = await request(app).get('/backend/errors/forbidden');
    expect(res.status).toBe(403);
    expectEnvelope(res.body, 403);
    expect(res.body.debug_error).toBe('USUARIO_INATIVO');
  });

  it('409 Prisma P2002 with details.code', async () => {
    const res = await request(app).get('/backend/errors/conflict-prisma');
    expect(res.status).toBe(409);
    expectEnvelope(res.body, 409);
    expect(res.body.details).toMatchObject({ code: 'P2002', target: ['cpf'] });
  });

  it('404 Prisma P2025 with details.code', async () => {
    const res = await request(app).get('/backend/errors/not-found-prisma');
    expect(res.status).toBe(404);
    expectEnvelope(res.body, 404);
    expect(res.body.details).toMatchObject({ code: 'P2025' });
  });

  it('401 token expired', async () => {
    const res = await request(app).get('/backend/errors/jwt-expired');
    expect(res.status).toBe(401);
    expect(res.body.details).toMatchObject({ code: 'TOKEN_EXPIRED' });
  });

  it('401 invalid token', async () => {
    const res = await request(app).get('/backend/errors/jwt-invalid');
    expect(res.status).toBe(401);
    expect(res.body.details).toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('418 preserves arbitrary HttpException status', async () => {
    const res = await request(app).get('/backend/errors/teapot');
    expect(res.status).toBe(418);
    expect(res.body.message).toBe('Teapot');
  });

  it('503 ServiceUnavailableException', async () => {
    const res = await request(app).get('/backend/errors/unavailable');
    expect(res.status).toBe(503);
    expectEnvelope(res.body, 503);
    expect(res.body.message).toBe('Python service offline');
  });

  describe('500 raw Error', () => {
    const original = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = original;
    });

    it('hides details in production', async () => {
      process.env.NODE_ENV = 'production';
      const res = await request(app).get('/backend/errors/boom');
      expect(res.status).toBe(500);
      expectEnvelope(res.body, 500);
      expect(res.body.message).toBe('Internal server error');
      expect(res.body.details).toBeUndefined();
    });

    it('exposes details in development', async () => {
      process.env.NODE_ENV = 'development';
      const res = await request(app).get('/backend/errors/boom');
      expect(res.status).toBe(500);
      expect(res.body.details).toMatchObject({
        original: 'Error',
        message: 'boom',
      });
    });
  });
});
