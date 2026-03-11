import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { SwaggerConfig } from './config.interface';

export function setupSwagger(app: INestApplication, config: SwaggerConfig) {
  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addBearerAuth();

  const document = SwaggerModule.createDocument(app, builder.build());

  SwaggerModule.setup(config.path, app, document, {
    useGlobalPrefix: true,
  });
}
