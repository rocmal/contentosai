import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { CreditsService } from '@modules/credits/application/services/credits.service';
import { CreditTransactionReason } from '@modules/credits/domain/entities/credit-transaction.entity';
import { CREDIT_COST } from '@modules/credits/credits.constants';

/** Reserves one text-generation credit before running a paid AI call and
 * refunds it if the call throws, so a failed attempt never costs the user. */
export async function runWithTextCredit<T>(
  credits: CreditsService,
  user: AuthenticatedUser,
  run: () => Promise<T>,
): Promise<T> {
  if (!user.organizationId || !user.workspaceId) {
    throw new BadRequestException('Your account is not attached to an organization workspace yet.');
  }
  const { organizationId, workspaceId } = user;
  const amount = CREDIT_COST.TEXT_PER_GENERATION;

  await credits.reserve({
    organizationId,
    workspaceId,
    amount,
    reason: CreditTransactionReason.GENERATION_TEXT,
    userId: user.id,
  });
  try {
    return await run();
  } catch (err) {
    await credits.refund({ organizationId, workspaceId, amount, userId: user.id });
    throw err;
  }
}
