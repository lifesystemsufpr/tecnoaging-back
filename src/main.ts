import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './shared/config/swagger.config';
import { NestFactory } from '@nestjs/core';
import {
  CorsConfig,
  NestConfig,
  SwaggerConfig,
} from './shared/config/config.interface';
import { PrismaClientExceptionFilter } from './shared/filters/prisma-client-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('AppInitializer');

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());
  logger.log('Starting application...');

  // Set global prefix
  //app.setGlobalPrefix('backend');

  // Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  // enable shutdown hook
  app.enableShutdownHooks();

  const appConfigService = app.get(ConfigService);
  const nestConfig = appConfigService.getOrThrow<NestConfig>('nest');
  const corsConfig = appConfigService.getOrThrow<CorsConfig>('cors');
  const swaggerConfig = appConfigService.getOrThrow<SwaggerConfig>('swagger');

  logger.log('Configs loaded...');

  if (swaggerConfig.enabled) {
    logger.log('Swagger enabled');
    setupSwagger(app, swaggerConfig);
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

  await app.listen(nestConfig.port, '0.0.0.0');
  logger.log(
    `[${nestConfig.environment}] Application is running on: ${await app.getUrl()}`,
  );
}

bootstrap();
