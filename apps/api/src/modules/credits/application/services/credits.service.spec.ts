import { CreditsService, InsufficientCreditsException } from './credits.service';
import {
  BILLING_PERIOD_DAYS,
  SCENE_VIDEO_CREDITS,
  TRIAL_CREDITS,
  addBillingPeriod,
  estimateVoiceMinutes,
  videoCreditsPer10Seconds,
  voiceCreditsPerMinute,
} from '../../credits.constants';
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

describe('credit prices shown before generating', () => {
  const service = new CreditsService({} as ICreditWalletsRepository, {} as ICreditTransactionsRepository);

  it('publishes the same voice and video rates the charge uses', () => {
    const rates = service.getRates();

    expect(rates.voice.perMinute.sarvam).toBe(voiceCreditsPerMinute('sarvam'));
    expect(rates.voice.wordsPerMinute).toBe(150);
    expect(rates.video.per10Seconds.default).toBe(videoCreditsPer10Seconds('veo'));
    expect(rates.sceneVideo.perVideo).toBe(SCENE_VIDEO_CREDITS);
  });

  it('works out voice minutes from the script, charging at least one minute', () => {
    const words = (count: number) => Array.from({ length: count }, () => 'word').join(' ');

    expect(estimateVoiceMinutes('')).toBe(1);
    expect(estimateVoiceMinutes(words(150))).toBe(1);
    expect(estimateVoiceMinutes(words(151))).toBe(2);
    expect(estimateVoiceMinutes(words(450))).toBe(3);
  });
});

describe('plans: 30-day periods that start fresh', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const makeService = (wallet: Record<string, unknown> | null) => {
    const wallets = {
      findByWorkspace: jest.fn().mockResolvedValue(wallet),
      create: jest
        .fn()
        .mockImplementation((data: Record<string, unknown>) => Promise.resolve(data)),
      setBalance: jest
        .fn()
        .mockImplementation((_ws: string, balance: number | null) =>
          Promise.resolve({ ...wallet, balance }),
        ),
      tryDecrement: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ICreditWalletsRepository>;
    const transactions = {
      create: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICreditTransactionsRepository>;
    return { service: new CreditsService(wallets, transactions), wallets, transactions };
  };

  it('runs a plan for exactly 30 days', () => {
    const start = new Date('2026-02-01T00:00:00Z');
    expect(BILLING_PERIOD_DAYS).toBe(30);
    expect(addBillingPeriod(start).toISOString()).toBe('2026-03-03T00:00:00.000Z');
  });

  it('gives a new workspace 500 trial credits, enough for an AI video', () => {
    expect(TRIAL_CREDITS).toBe(500);
    expect(TRIAL_CREDITS).toBeGreaterThan(videoCreditsPer10Seconds('veo'));
  });

  it('starts the first period 30 days long', async () => {
    const { service, wallets } = makeService(null);

    await service.grantInitial('org-1', 'ws-1', 'starter', 'user-1', TRIAL_CREDITS);

    const data = wallets.create.mock.calls[0][0];
    expect(data.balance).toBe(500);
    expect(data.cycleEndAt!.getTime() - data.cycleStartAt!.getTime()).toBe(30 * DAY);
  });

  it('starts each renewed period with a fresh allotment: unused credits do not carry over', async () => {
    const { service, wallets, transactions } = makeService({ workspaceId: 'ws-1', balance: 300 });
    const start = new Date();
    const end = addBillingPeriod(start);

    const wallet = await service.grantMonthlyRenewal('org-1', 'ws-1', 'starter', start, end);

    expect(wallets.setBalance).toHaveBeenCalledWith('ws-1', 2500, start, end);
    expect(wallet.balance).toBe(2500);
    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        reason: CreditTransactionReason.PLAN_MONTHLY_GRANT,
        balanceAfter: 2500,
      }),
    );
  });

  it('removes the credits left on a lapsed plan, and records it', async () => {
    const { service, wallets, transactions } = makeService({
      workspaceId: 'ws-1',
      balance: 933,
      cycleStartAt: null,
      cycleEndAt: null,
    });

    await service.expire('org-1', 'ws-1');

    expect(wallets.setBalance).toHaveBeenCalledWith('ws-1', 0, expect.any(Date), null);
    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: -933,
        reason: CreditTransactionReason.PLAN_EXPIRED,
        balanceAfter: 0,
      }),
    );
  });

  it('refuses a charge the balance cannot cover', async () => {
    const { service } = makeService({ workspaceId: 'ws-1', balance: 5 });

    await expect(
      service.reserve({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        amount: 20,
        reason: CreditTransactionReason.GENERATION_VIDEO,
      }),
    ).rejects.toBeInstanceOf(InsufficientCreditsException);
  });

  it('publishes the trial size with the prices', () => {
    expect(makeService(null).service.getRates().trial.credits).toBe(TRIAL_CREDITS);
  });
});
