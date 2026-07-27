import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '@common/interfaces/request-with-user.interface';

/** Extracts the active workspace id from the authenticated user's JWT claims. */
export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.workspaceId ?? null;
  },
);

/** Extracts the active organization id from the authenticated user's JWT claims. */
export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.organizationId ?? null;
  },
);
