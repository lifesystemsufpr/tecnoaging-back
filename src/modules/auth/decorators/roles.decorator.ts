import { Reflector } from '@nestjs/core';
import { SystemRole } from '@prisma/client';

export const Roles = Reflector.createDecorator<SystemRole[]>();
