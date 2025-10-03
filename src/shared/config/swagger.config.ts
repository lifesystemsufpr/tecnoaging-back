import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { SwaggerConfig } from './config.interface';

export const setupSwagger = (
  app: INestApplication,
  swaggerConfig: SwaggerConfig,
) => {
  const documentOptions = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentOptions);
  const customOptions: SwaggerCustomOptions = {
    yamlDocumentUrl: swaggerConfig.path + '/export',
    raw: ['yaml'],
  };

  SwaggerModule.setup(swaggerConfig.path, app, document, customOptions);
};
