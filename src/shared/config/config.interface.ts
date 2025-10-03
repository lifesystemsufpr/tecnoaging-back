export interface AppConfig {
  nest: NestConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
  security: SecurityConfig;
}

export interface NestConfig {
  port: number;
  environment: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpirationTime: string;
  jwtRefreshExpirationTime: string;
}

export interface CorsConfig {
  enabled: boolean;
  corsOrigins: boolean | string[] | string;
}

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  path: string;
  enabled: boolean;
}
