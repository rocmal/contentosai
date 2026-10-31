import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ADMIN_KEY } from '@common/decorators/platform-admin.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';

/** Lets a @PlatformAdminOnly() route through only for a platform admin (see AuthService.buildAuthenticatedUser). */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Only Lumora platform admins can do this.');
    }
    return true;
  }
}
