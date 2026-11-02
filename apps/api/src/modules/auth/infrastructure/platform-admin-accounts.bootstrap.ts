import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AuthService } from '../application/services/auth.service';

/**
 * Creates the platform admin accounts named by PLATFORM_ADMIN_EMAILS that do not exist yet, with
 * PLATFORM_ADMIN_INITIAL_PASSWORD (both GitHub secrets). It runs on every start rather than as a one-time seeder:
 * seeders run once per database, so one that ran before the secrets were added would never run again. A failure is
 * logged and never stops the API.
 */
@Injectable()
export class PlatformAdminAccountsBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformAdminAccountsBootstrap.name);

  constructor(private readonly authService: AuthService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.authService.ensurePlatformAdminAccounts();
    } catch (err) {
      this.logger.error(
        `Platform admin accounts were not checked: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
