import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import {
  BadRequestException,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './shared/config/swagger.config';
import { NestFactory } from '@nestjs/core';
import {
  CorsConfig,
  NestConfig,
  SwaggerConfig,
} from './shared/config/config.interface';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { NormalizationPipe } from './shared/pipes/normalization.pipe';
import { SanitizationPipe } from './shared/pipes/sanitization.pipe';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import basicAuth = require('express-basic-auth');

interface FlatValidationField {
  field: string;
  constraints: Record<string, string>;
}

function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): FlatValidationField[] {
  const out: FlatValidationField[] = [];
  for (const err of errors) {
    const field = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) {
      out.push({ field, constraints: err.constraints });
    }
    if (err.children?.length) {
      out.push(...flattenValidationErrors(err.children, field));
    }
  }
  return out;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'backend';
  app.setGlobalPrefix(globalPrefix);
  const logger = new Logger('AppInitializer');

  app.use(json({ limit: '500mb' }));
  app.use(urlencoded({ limit: '500mb', extended: true }));
  app.use(cookieParser());
  logger.log('Starting application...');

  // Validation
  app.useGlobalPipes(
    new SanitizationPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const fields = flattenValidationErrors(errors);
        const messages = fields.flatMap((f) =>
          Object.values(f.constraints ?? {}),
        );
        return new BadRequestException({
          message: messages,
          details: { fields },
        });
      },
    }),
    new NormalizationPipe(),
  );

  // enable shutdown hook
  app.enableShutdownHooks();

  const appConfigService = app.get(ConfigService);
  const nestConfig = appConfigService.getOrThrow<NestConfig>('nest');
  const corsConfig = appConfigService.getOrThrow<CorsConfig>('cors');
  const swaggerConfig = appConfigService.getOrThrow<SwaggerConfig>('swagger');

  logger.log('Configs loaded...');

  if (swaggerConfig.enabled) {
    logger.log('Swagger enabled');

    const swaggerPath = swaggerConfig.path;
    const swaggerRoutes = [
      `/${swaggerPath}`,
      `/${swaggerPath}-json`,
      `/${globalPrefix}/${swaggerPath}`,
      `/${globalPrefix}/${swaggerPath}-json`,
    ];

    app.use(
      swaggerRoutes,
      basicAuth({
        challenge: true,
        users: {
          [process.env.SWAGGER_USER || 'admin']:
            process.env.SWAGGER_PASSWORD || 'admin',
        },
      }),
    );

    setupSwagger(app, {
      ...swaggerConfig,
      path: `${globalPrefix}/${swaggerConfig.path}`,
    });
  }

  if (corsConfig.enabled) {
    logger.log('CORS enabled');
    app.enableCors({
      origin: [
        corsConfig.corsOrigins,
        'http://localhost:3000',
        'https://localhost:3000',
        'https://*.vercel.app',
        'https://tecnoaging-front.vercel.app',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  } else {
    // Se CORS não estiver habilitado no config, use configuração padrão
    logger.log('CORS enabled (default)');
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'https://localhost:3000',
        'https://*.vercel.app',
        'https://tecnoaging-front.vercel.app',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  }

  const port = Number(nestConfig.port) || 3333;
  await app.listen(port, '127.0.0.1');

  logger.log(
    `[${nestConfig.environment}] Application is running on: ${await app.getUrl()}`,
  );
}

bootstrap().catch((err) => {
  console.error('Error starting application:', err);
  process.exit(1);
});
