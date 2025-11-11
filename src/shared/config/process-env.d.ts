declare namespace NodeJS {
  interface ProcessEnv {
    // Variáveis de Ambiente Principais
    NODE_ENV?: string;
    NEST_PORT?: string;

    // Configurações de Segurança (JWT)
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    JWT_REFRESH_EXPIRES_IN?: string;

    // Configurações de HTTPS/SSL
    HTTPS_ENABLED?: string;
    SSL_KEY_PATH?: string;
    SSL_CERT_PATH?: string;

    // Configurações do Swagger
    SWAGGER_TITLE?: string;
    SWAGGER_DESCRIPTION?: string;
    SWAGGER_VERSION?: string;
    SWAGGER_PATH?: string;
    SWAGGER_ENABLED?: string;

    // Configurações do CORS
    CORS_ENABLED?: string;
    CORS_ORIGINS?: string;

    HEALTH_HEAP_LIMIT_MB?: string;
    HEALTH_RSS_LIMIT_MB?: string;
  }
}
