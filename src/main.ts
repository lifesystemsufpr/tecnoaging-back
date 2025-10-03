import { AppModule } from './app.module';
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
import * as fs from 'fs';

async function bootstrap() {
  const configService = new ConfigService();
  const nestConfig = configService.getOrThrow<NestConfig>('nest');
  
  let httpsOptions = undefined;
  
  // Configure HTTPS if enabled and certificates are provided
  if (nestConfig.httpsEnabled && nestConfig.sslKeyPath && nestConfig.sslCertPath) {
    try {
      httpsOptions = {
        key: fs.readFileSync(nestConfig.sslKeyPath),
        cert: fs.readFileSync(nestConfig.sslCertPath),
      };
      console.log('🔒 HTTPS enabled with SSL certificates');
    } catch (error) {
      console.warn('⚠️  HTTPS enabled but SSL certificates not found, falling back to HTTP');
      httpsOptions = undefined;
    }
  }
  
  const app = await NestFactory.create(AppModule, { httpsOptions });
  const logger = new Logger('AppInitializer');

  logger.log('Starting application...');

  // Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  // enable shutdown hook
  app.enableShutdownHooks();

  const appConfigService = app.get(ConfigService);
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
      origin: [corsConfig.corsOrigins,'http://localhost:3000'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
    });
  } else {
    // Se CORS não estiver habilitado no config, use configuração padrão
    logger.log('CORS enabled (default)');
    app.enableCors({
      origin: 'http://localhost:3000',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
    });
  }

  await app.listen(nestConfig.port);
  logger.log(
    `[${nestConfig.environment}] Application is running on: ${await app.getUrl()}`,
  );
}

bootstrap();
