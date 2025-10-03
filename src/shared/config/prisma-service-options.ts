import { Logger } from '@nestjs/common';
import { loggingMiddleware } from 'nestjs-prisma';

export const appPrismaServiceOptions = {
  middlewares: [
    loggingMiddleware({
      logger: new Logger('PrismaService'),
      logLevel: 'log',
    }),
  ],
};
