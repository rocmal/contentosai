import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuroraBackdrop, LoginSplash, SparkMark, Waveform } from '../components/auth/LoginArt';

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
    <div className="flex-1 flex flex-col overflow-y-auto min-h-screen">
      <LoginSplash />
      <div className="relative overflow-hidden px-7 pt-8 pb-14 text-white">
        <AuroraBackdrop />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-10">
            <SparkMark size={40} />
            <span className="font-display text-[19px]">Lumora</span>
          </div>
          <h1 className="font-display text-[27px] mb-1.5">Welcome back</h1>
          <p className="text-[13px] text-white/60">Sign in to keep creating.</p>
          <Waveform animated className="mt-5 opacity-80" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative -mt-6 flex-1 flex flex-col gap-3.5 rounded-t-[28px] bg-white px-7 pt-7 pb-8">
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
