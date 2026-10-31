import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CreditCard, KeyRound, Loader2, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ApiError,
  changeMyPassword,
  getMyCreditWallet,
  listMyCreditTransactions,
  requestMyPasswordReset,
  updateMyProfile,
} from '../../lib/api';
import { CreditsBreakdown, TeamSeatsCard } from '../UsagePanels';
import { ViewType } from '../../types';
import type { CreditTransaction, CreditWallet } from '../../lib/api';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    'generation.image': 'Image generation',
    'generation.voice': 'Voice generation',
    'generation.video': 'Video generation',
    'generation.character': 'Character video generation',
    'plan.initial_grant': 'Plan credits (initial)',
    'plan.monthly_grant': 'Plan credits (renewal)',
    refund: 'Refund',
    'admin.adjustment': 'Manual adjustment',
  };
  return labels[reason] ?? reason;
}

const field =
  'w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500';

/** Change the password (current + new). The server signs every other device out; this one stays signed in. */
const PasswordCard: React.FC<{ onForgot: () => void; resetSending: boolean; resetSent: boolean }> = ({
  onForgot,
  resetSending,
  resetSent,
}) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem =
    next && next.length < 8
      ? 'The new password needs at least 8 characters.'
      : confirm && confirm !== next
        ? 'The two new passwords do not match.'
        : next && next === current
          ? 'Pick a new password that is different from the current one.'
          : null;
  const canSave = !!current && next.length >= 8 && confirm === next && next !== current && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await changeMyPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
    >
      <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
        <KeyRound className="w-3.5 h-3.5" /> Password
      </h3>
      <div>
        <label htmlFor="current-password" className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={field}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="new-password" className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
            New password again
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={field}
          />
        </div>
      </div>
      {(problem || error) && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error ?? problem}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
          <Check className="w-3.5 h-3.5 shrink-0" /> Password changed. Every other device has been signed out.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={!canSave}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? 'Changing...' : 'Change password'}
        </button>
        <button
          type="button"
          onClick={onForgot}
          disabled={resetSending || resetSent}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-60"
        >
          {resetSent ? 'Reset link sent to your email' : resetSending ? 'Sending...' : 'Forgot it? Email me a reset link'}
        </button>
      </div>
    </form>
  );
};

export const ProfileView: React.FC<{ onNavigate?: (view: ViewType) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [wallet, setWallet] = useState<CreditWallet | null | undefined>(undefined);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);

  useEffect(() => {
    getMyCreditWallet()
      .then(setWallet)
      .catch(() => setWallet(null));
    listMyCreditTransactions({ limit: 25 })
      .then((result) => setTransactions(result.items))
      .catch(() => setTransactions([]));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({ firstName, lastName, avatarUrl: avatarUrl || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user) return;
    setResetSending(true);
    try {
      await requestMyPasswordReset(user.email);
      setResetSent(true);
    } catch {
      // forgot-password never reveals whether it succeeded server-side either - fail silently here too.
      setResetSent(true);
    } finally {
      setResetSending(false);
    }
  };

  const usedThisCycle =
    wallet && wallet.balance !== null && transactions
      ? transactions
          .filter((t) => t.amount < 0 && t.reason.startsWith('generation.'))
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACCOUNT CARD */}
        <form
          onSubmit={handleSave}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs"
        >
          <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Account
          </h3>

          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                {(firstName[0] ?? user?.email[0] ?? '?').toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Avatar URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Email</label>
            <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </form>

        <PasswordCard
          onForgot={handlePasswordReset}
          resetSending={resetSending}
          resetSent={resetSent}
        />

        {/* PLAN & USAGE CARD */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Plan &amp; Usage
          </h3>

          {wallet === undefined ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : wallet === null ? (
            <p className="text-xs text-slate-400">No credit wallet found for your workspace yet.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {wallet.balance === null ? 'Unlimited' : wallet.balance.toLocaleString()}
                </span>
                {wallet.balance !== null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">credits remaining</span>
                )}
              </div>

              {wallet.balance !== null && usedThisCycle !== null && (
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (usedThisCycle / (usedThisCycle + wallet.balance)) * 100 || 0)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {usedThisCycle.toLocaleString()} used this cycle
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Cycle: {formatDate(wallet.cycleStartAt)} → {formatDate(wallet.cycleEndAt)}
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Credit usage history
                </h4>
                {transactions === null ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : transactions.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No credit activity yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-[11px] gap-3">
                        <div className="min-w-0">
                          <p className="text-slate-600 dark:text-slate-300 truncate">{reasonLabel(tx.reason)}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(tx.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 font-mono font-semibold ${tx.amount < 0 ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-400'}`}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Moved here from the Dashboard, which now shows numbers only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreditsBreakdown />
        {onNavigate && <TeamSeatsCard onNavigate={onNavigate} />}
      </div>
    </div>
  );
};
