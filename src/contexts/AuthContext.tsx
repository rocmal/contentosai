import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../lib/api';

interface AuthContextValue {
  user: api.AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<api.AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first load, silently exchange any persisted refresh token for a fresh
  // session instead of forcing the user to log in again on every reload.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restoredUser = await api.restoreSession();
      if (!cancelled) {
        setUser(restoredUser);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const loggedInUser = await api.login(email, password);
      setUser(loggedInUser);
    } catch (err) {
      const message = err instanceof api.ApiError ? err.message : 'Unable to sign in. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }) => {
      setError(null);
      try {
        const newUser = await api.register(input);
        setUser(newUser);
      } catch (err) {
        const message = err instanceof api.ApiError ? err.message : 'Unable to create your account. Please try again.';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
