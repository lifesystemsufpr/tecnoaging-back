export interface AppConfig {
  nest: NestConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
  security: SecurityConfig;
  email: EmailConfig;
  passwordRecovery: PasswordRecoveryConfig;
}

export interface NestConfig {
  port: number;
  environment: string;
  httpsEnabled?: boolean;
  sslKeyPath?: string;
  sslCertPath?: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpirationTime: number;
  jwtRefreshExpirationTime: number;
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
  useGlobalPrefix: boolean;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  fromName: string;
}

export interface PasswordRecoveryConfig {
  tokenExpiryHours: number;
  frontendBaseUrl: string;
}
