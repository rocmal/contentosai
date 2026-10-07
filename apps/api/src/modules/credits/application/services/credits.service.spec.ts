import { CreditsService } from './credits.service';
import { CreditTransactionReason } from '../../domain/entities/credit-transaction.entity';
import { ICreditTransactionsRepository } from '../../domain/repositories/credit-transaction-repository.interface';
import { ICreditWalletsRepository } from '../../domain/repositories/credit-wallet-repository.interface';

describe('CreditsService.getUsageSummary', () => {
  const makeService = (summary: {
    byReason: { reason: CreditTransactionReason; credits: number; count: number }[];
    refunded: number;
  }) => {
    const transactions = {
      summarizeUsage: jest.fn().mockResolvedValue(summary),
    } as unknown as jest.Mocked<ICreditTransactionsRepository>;
    return {
      service: new CreditsService({} as ICreditWalletsRepository, transactions),
      transactions,
    };
  };

  it('adds up what was spent and takes refunds off the total', async () => {
    const { service } = makeService({
      byReason: [
        { reason: CreditTransactionReason.GENERATION_IMAGE, credits: 130, count: 10 },
        { reason: CreditTransactionReason.GENERATION_VIDEO, credits: 360, count: 2 },
      ],
      refunded: 180,
    });

    const usage = await service.getUsageSummary('ws-1', 30);

    expect(usage.creditsUsed).toBe(310);
    expect(usage.byReason).toHaveLength(2);
    expect(usage.days).toBe(30);
  });

  it('never reports negative usage when refunds exceed spending in the window', async () => {
    const { service } = makeService({ byReason: [], refunded: 50 });
    expect((await service.getUsageSummary('ws-1')).creditsUsed).toBe(0);
  });

  it('looks back the requested number of days', async () => {
    const { service, transactions } = makeService({ byReason: [], refunded: 0 });
    const before = Date.now();

    await service.getUsageSummary('ws-1', 7);

    const since = transactions.summarizeUsage.mock.calls[0][1].getTime();
    expect(before - since).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 5);
    expect(before - since).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 60_000);
  });
});
