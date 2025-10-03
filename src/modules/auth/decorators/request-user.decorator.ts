import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const RequestUser = createParamDecorator(
  (_data: unknown, executionContext: ExecutionContext) => {
    const request = executionContext.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
