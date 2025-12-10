import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { loggingMiddleware } from 'nestjs-prisma';

function normalizeForSearch(str: string): string {
  if (!str) return str;
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const normalizationMiddleware: Prisma.Middleware = async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'create' || params.action === 'update') {
      const data = params.args.data;
      if (data && data.fullName) {
        data.fullName_normalized = normalizeForSearch(data.fullName);
      }
    }

    if (params.action === 'createMany' && Array.isArray(params.args.data)) {
      params.args.data.forEach((item: any) => {
        if (item.fullName) {
          item.fullName_normalized = normalizeForSearch(item.fullName);
        }
      });
    }
  }
  return next(params);
};

export const appPrismaServiceOptions = {
  middlewares: [
    loggingMiddleware({
      logger: new Logger('PrismaService'),
      logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'log',
    }),
  ],
};
