import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@common/decorators/permissions.decorator';
import { RequestWithUser } from '@common/interfaces/request-with-user.interface';

/** Grants access only when the authenticated user holds every required permission. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user?.permissions?.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('You do not have the required permissions for this action');
    }

    return true;
  }
}
