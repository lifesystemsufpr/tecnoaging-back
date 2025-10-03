import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '../decorators/roles.decorator';
import { SystemRole } from '@prisma/client';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());

    if (!roles || roles.length === 0) {
      return true; // caso não tenha o decorator de proteção por role, libera acesso
    }

    const { user } = context.switchToHttp().getRequest();
    if (user.role === SystemRole.MANAGER) {
      return true; // override se necessário -- manager tem permissão total do sistema
    }
    return this.matchRoles(roles, user.role);
  }

  private matchRoles(roles: string[], userRole: SystemRole): boolean {
    return userRole && roles.includes(userRole);
  }
}
