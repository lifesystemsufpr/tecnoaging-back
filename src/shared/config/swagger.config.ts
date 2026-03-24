import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { INestApplication } from "@nestjs/common";
import { SwaggerConfig } from "./config.interface";

export function setupSwagger(app: INestApplication, config: SwaggerConfig) {
  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        in: "header",
        name: "Authorization",
      },
      "bearer",
    )
    .addSecurityRequirements("bearer");

  const document = SwaggerModule.createDocument(app, builder.build());

  SwaggerModule.setup(config.path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
