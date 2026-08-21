import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const MobileLoginScreen: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // AuthContext already captured a user-facing message in `error`.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-7 pt-6 pb-8 overflow-y-auto min-h-screen">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center flex-none">
          <Sparkles className="w-[18px] h-[18px] text-white" />
        </div>
        <span className="font-display text-[19px] text-slate-900">Lumora</span>
      </div>
      <h1 className="font-display text-[27px] text-slate-900 mb-1.5">Welcome back</h1>
      <p className="text-[13px] text-slate-500 mb-6">Sign in to keep creating.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="block text-xs text-slate-600 mb-1.5" htmlFor="mobile-login-email">
            Email
          </label>
          <input
            id="mobile-login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[46px] px-4 rounded-full border border-slate-200 bg-slate-100 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1.5" htmlFor="mobile-login-password">
            Password
          </label>
          <input
            id="mobile-login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[46px] px-4 rounded-full border border-slate-200 bg-slate-100 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        </div>

        {error && <p className="text-[13px] text-red-600 px-1">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="h-[50px] text-[15px] mt-2.5 w-full rounded-full bg-blue-600 text-white font-bold disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <a
          href="/signup"
          className="mt-4 self-center text-[13px] text-blue-600 font-bold"
        >
          New to Lumora? Create an account
        </a>
      </form>
    </div>
  );
};
