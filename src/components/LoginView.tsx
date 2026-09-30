import React, { useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { requestMyPasswordReset } from '../lib/api';

type Mode = 'signin' | 'signup' | 'forgot';

interface LoginViewProps {
  initialMode?: Mode;
  onBack?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ initialMode = 'signin', onBack }) => {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setLocalError(null);
    setPassword('');
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      if (mode === 'forgot') {
        await requestMyPasswordReset(email);
        setResetSent(true);
      } else if (mode === 'signup') {
        await register({ email, password, firstName, lastName });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : mode === 'signup' ? 'Sign up failed' : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </button>
        )}
        <div className="flex items-center gap-2.5 justify-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">Lumora</span>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'signin' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'signup' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Start free trial
            </button>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Sign in'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === 'signup'
                ? 'Start free. Cancel anytime, no setup fees.'
                : mode === 'forgot'
                  ? "Enter your email and we'll send you a link to choose a new password."
                  : 'Sign in to your Lumora workspace.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">First name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Last name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
            {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Password</label>
              <input
                type="password"
                required
                minLength={mode === 'signup' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="mt-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            )}

            {resetSent && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                If an account exists for that email, a reset link is on its way. It expires in 1 hour.
              </p>
            )}

            {(localError || error) && (
              <p className="text-[11px] text-red-500 font-medium">{localError || error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {submitting
                  ? mode === 'signup'
                    ? 'Creating account...'
                    : mode === 'forgot'
                      ? 'Sending...'
                      : 'Signing in...'
                  : mode === 'signup'
                    ? 'Create free account'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : 'Sign In'}
              </span>
            </button>
          </form>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-[11px] font-semibold text-slate-500 hover:underline"
            >
              Back to sign in
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
