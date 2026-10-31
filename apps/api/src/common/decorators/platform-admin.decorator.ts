import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_KEY = 'platformAdminOnly';

/** Restricts a route to Lumora's platform admins (PLATFORM_ADMIN_EMAILS) - routes that act across customers, such
 * as listing every user or changing a workspace's credits. A workspace's own super-admin is not enough. */
export const PlatformAdminOnly = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
