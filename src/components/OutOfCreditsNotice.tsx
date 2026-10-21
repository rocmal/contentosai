import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ViewType } from '../types';
import { getMyCreditWallet } from '../lib/api';

interface OutOfCreditsNoticeProps {
  onNavigate: (view: ViewType) => void;
}

/** Shown instead of the generic red error box when a generation fails with
 * 402 (ApiError.status) - CreditsService.reserve() throws before any paid
 * provider is ever called, so this always means "add credits", not "the
 * generation itself failed." A lapsed plan keeps its credits but pauses them,
 * which is the other reason for a 402 - the notice checks the wallet and says
 * which one it is. */
export const OutOfCreditsNotice: React.FC<OutOfCreditsNoticeProps> = ({ onNavigate }) => {
  const [pausedCredits, setPausedCredits] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyCreditWallet()
      .then((wallet) => {
        if (!cancelled && wallet.pausedAt) setPausedCredits(wallet.balance ?? 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
      <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="space-y-1.5">
        <p className="text-[11px] leading-snug font-semibold">
          {pausedCredits !== null
            ? `Your plan has ended, so your ${pausedCredits.toLocaleString()} credits are paused. Renew to use them.`
            : 'Out of credits for this billing cycle.'}
        </p>
        <button
          onClick={() => onNavigate(pausedCredits !== null ? 'billing' : 'profile')}
          className="text-[11px] font-bold underline hover:no-underline"
        >
          {pausedCredits !== null ? 'Renew your plan →' : <>View plan &amp; usage →</>}
        </button>
      </div>
    </div>
  );
};
