import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, Loader2, UserPlus, Users } from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CreditUsageSummary, getMyCreditUsage, getMySubscription, listTeamMembers } from '../lib/api';
import { PRICING_PLANS } from '../lib/pricingPlans';
import { MANAGE_MEMBERS_PERMISSION, requestInviteForm, seatsLeft, seatsOver, seatSummary } from '../lib/teamInvite';

const PERIODS = [7, 30, 90] as const;

const SOURCES: { reason: string; label: string; bar: string }[] = [
  { reason: 'generation.image', label: 'Image Studio', bar: 'bg-blue-500' },
  { reason: 'generation.video', label: 'Video Studio', bar: 'bg-teal-500' },
  { reason: 'generation.voice', label: 'Voice Studio', bar: 'bg-emerald-500' },
];

const card = 'p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4';

/** "Where your credits went": credits spent per studio over 7, 30 or 90 days. Lives under Profile > Plan & Usage. */
export const CreditsBreakdown: React.FC = () => {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [usage, setUsage] = useState<CreditUsageSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUsage(null);
    getMyCreditUsage(days)
      .then((u) => !cancelled && setUsage(u))
      .catch(() => !cancelled && setUsage({ days, creditsUsed: 0, byReason: [] }));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const rows = SOURCES.map((s) => ({ ...s, credits: usage?.byReason.find((r) => r.reason === s.reason)?.credits ?? 0 }));
  const total = rows.reduce((sum, row) => sum + row.credits, 0);

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Where your credits went</h3>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                days === p ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>
      {usage === null ? (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : total === 0 ? (
        <p className="text-[11px] text-slate-400">Nothing generated in the last {days} days.</p>
      ) : (
        <div className="space-y-3.5">
          {[...rows]
            .sort((a, b) => b.credits - a.credits)
            .map((row) => {
              const share = Math.round((row.credits / total) * 100);
              return (
                <div key={row.reason} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{row.label}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {row.credits.toLocaleString()} credits · {share}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${row.bar} transition-all`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

/** Seats on the plan: how many are used, then Invite when there is room or Upgrade when there is none (or the
 * workspace is over its limit). Only shown to people who are allowed to add teammates. */
export const TeamSeatsCard: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [seats, setSeats] = useState<{ used: number; limit: number | null; planName: string } | null>(null);
  const canManage = Boolean(user?.permissions?.includes(MANAGE_MEMBERS_PERMISSION));

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    Promise.all([listTeamMembers(), getMySubscription()])
      .then(([members, subscription]) => {
        if (cancelled) return;
        // No subscription yet means the free starter allowance, which has one seat.
        const plan = PRICING_PLANS.find((p) => p.key === (subscription?.plan ?? 'starter')) ?? PRICING_PLANS[0];
        setSeats({ used: members.length, limit: plan.seatLimit, planName: plan.name });
      })
      .catch(() => !cancelled && setSeats(null));
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  if (!canManage || seats === null) return null;

  const left = seatsLeft(seats.limit, seats.used);
  const over = seatsOver(seats.limit, seats.used);
  const full = left === 0;
  const share = seats.limit === null ? 0 : Math.min(100, Math.round((seats.used / seats.limit) * 100));

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Users className="w-4 h-4 text-blue-500" /> Your team
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{seats.planName} plan</span>
      </div>
      <p className={`text-xs ${over > 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
        {seatSummary(seats.limit, seats.used)}
        {left !== null && left > 0 ? ` · ${left} left` : ''}
      </p>
      {seats.limit !== null && (
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all ${over > 0 ? 'bg-red-500' : full ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${share}%` }}
          />
        </div>
      )}
      {full ? (
        <>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {over > 0
              ? 'You have more people than this plan includes. Remove a member or upgrade to keep them all.'
              : 'Every seat on your plan is taken. Upgrade to add more teammates.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all active:scale-[0.98]"
          >
            <ArrowUpCircle className="w-4 h-4" /> Upgrade for more seats
          </button>
        </>
      ) : (
        <>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Add a teammate so they can create and share in the same gallery.
          </p>
          <button
            type="button"
            onClick={() => {
              requestInviteForm();
              onNavigate('team');
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" /> Invite a teammate
          </button>
        </>
      )}
    </div>
  );
};
