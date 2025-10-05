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
 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('AppInitializer');

  logger.log('Starting application...');

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

    const allowedOrigins = [
        ...(Array.isArray(corsConfig.corsOrigins) ? corsConfig.corsOrigins : [corsConfig.corsOrigins]),
        'http://localhost:3000',
        'https://equilibrium.giize.com', 
        'https://tecnoaging-front-black.vercel.app'
    ];

    app.enableCors({
        origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization, Range',
        credentials: true,
        exposedHeaders: ['Content-Length', 'Content-Range'],
    });
} else {
    logger.log('CORS enabled (default)');
    app.enableCors({
        origin: 'http://localhost:3000',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization, Range',
        credentials: true,
        exposedHeaders: ['Content-Length', 'Content-Range'],
    });
}

  await app.listen(nestConfig.port, '0.0.0.0');
  logger.log(
    `[${nestConfig.environment}] Application is running on: ${await app.getUrl()}`,
  );
}

bootstrap();
