import { Logger } from '@nestjs/common';
import { AppConfig, SecurityConfig } from './config.interface';

const securityConfig: SecurityConfig = {
  jwtSecret: process.env.JWT_SECRET || 'defaultSecret',
  jwtExpirationTime: process.env.JWT_EXPIRES_IN || '15h',
  jwtRefreshExpirationTime: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

const appConfig: AppConfig = {
  nest: {
    port: process.env.NEST_PORT ? +process.env.NEST_PORT : 3333,
    environment: process.env.NODE_ENV || 'development',
    httpsEnabled: process.env.HTTPS_ENABLED === 'true',
    sslKeyPath: process.env.SSL_KEY_PATH,
    sslCertPath: process.env.SSL_CERT_PATH,
  },
  swagger: {
    title: process.env.SWAGGER_TITLE || 'tecnoaging-web',
    description: process.env.SWAGGER_DESCRIPTION || 'API Documentation',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    path: process.env.SWAGGER_PATH || 'api-docs',
    enabled: process.env.SWAGGER_ENABLED
      ? Boolean(process.env.SWAGGER_ENABLED)
      : true,
  },
  cors: {
    enabled: process.env.CORS_ENABLED
      ? Boolean(process.env.CORS_ENABLED)
      : false,
    corsOrigins: getCorsOrigins(process.env.CORS_ORIGINS),
  },
  security: securityConfig,
};

export default () => {
  const logger = new Logger('AppConfig');
  logger.log(`Loaded application configuration: ${JSON.stringify(appConfig)}`);
  return appConfig;
};

function getCorsOrigins(corsOrigins: string | undefined) {
  if (!corsOrigins || corsOrigins === 'false') {
    return false;
  }
  if (corsOrigins === 'true') {
    return true;
  }
  if (corsOrigins === '*') {
    return '*';
  }
  return corsOrigins.split(',').map((origin) => origin.trim());
}
