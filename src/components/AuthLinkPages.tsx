import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { ApiError, confirmEmailVerification, confirmPasswordReset } from '../lib/api';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
    <div className="w-full max-w-sm space-y-6">
      <div className="flex items-center gap-2.5 justify-center">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">Lumora</span>
      </div>
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {children}
      </div>
    </div>
  </div>
);

const inputClass =
  'w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500';

function tokenFromUrl(): string {
  return new URLSearchParams(window.location.search).get('token') ?? '';
}

interface AuthLinkPageProps {
  onContinue: () => void;
}

export const ResetPasswordPage: React.FC<AuthLinkPageProps> = ({ onContinue }) => {
  const token = tokenFromUrl();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.message}. Request a new reset link from the sign-in page.`
          : 'Could not reset your password. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Shell>
        <XCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">This reset link is incomplete</p>
        <p className="text-xs text-slate-500">Open the link from your email again, or request a new one from the sign-in page.</p>
        <button onClick={onContinue} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Go to sign in
        </button>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">Password updated</p>
        <p className="text-xs text-slate-500">You can now sign in with your new password.</p>
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs"
        >
          Go to sign in
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Choose a new password</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use at least 8 characters.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </Shell>
  );
};

export const VerifyEmailPage: React.FC<AuthLinkPageProps> = ({ onContinue }) => {
  const token = tokenFromUrl();
  const [state, setState] = useState<'verifying' | 'done' | 'error'>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is incomplete.');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    confirmEmailVerification(token)
      .then(() => {
        if (!cancelled) setState('done');
      })
      .catch((err) => {
        if (cancelled) return;
        setState('error');
        setMessage(err instanceof ApiError ? err.message : 'Could not verify your email.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Shell>
      {state === 'verifying' && (
        <>
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Verifying your email...</p>
        </>
      )}
      {state === 'done' && (
        <>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Email verified</p>
          <p className="text-xs text-slate-500">Thanks - your email address is confirmed.</p>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">We could not verify your email</p>
          <p className="text-xs text-slate-500">{message} The link may have expired or already been used.</p>
        </>
      )}
      {state !== 'verifying' && (
        <button onClick={onContinue} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Continue to Lumora
        </button>
      )}
    </Shell>
  );
};
