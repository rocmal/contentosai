import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from './api';
import { disablePush, enablePush } from './push';

interface AuthState {
  user: api.AuthUser | null;
  /** True until the stored session has been checked on launch. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.setSessionExpiredHandler(() => setUser(null));
    (async () => {
      try {
        if (await api.loadTokens()) setUser(await api.getCurrentUser());
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email.trim(), password));
  }, []);

  const signUp = useCallback(async (input: { email: string; password: string; firstName: string; lastName: string }) => {
    setUser(await api.register({ ...input, email: input.email.trim() }));
  }, []);

  const signOut = useCallback(async () => {
    await disablePush();
    await api.logout();
    setUser(null);
  }, []);

  // Ask for notification permission once a person is signed in, however they got here.
  const userId = user?.id;
  useEffect(() => {
    if (userId) void enablePush();
  }, [userId]);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
