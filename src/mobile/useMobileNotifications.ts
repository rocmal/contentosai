import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { isToday } from './notificationDisplay';

/** Fetches the current user's notifications once and keeps them in local
 * state so Home's bell dot and the Notifications overlay share one fetch
 * and one optimistic mark-as-read, instead of each screen polling
 * independently. Lifted into MobileApp and passed down, the same way
 * useMobilePosts is. */
export function useMobileNotifications(): {
  today: api.AppNotification[];
  earlier: api.AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (id: string) => void;
  reload: () => void;
} {
  const [items, setItems] = useState<api.AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listMyNotifications({ limit: 30 });
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Marks a notification read immediately in local state (so the tap feels
   * instant), then confirms with the server; a failure just re-syncs from
   * the server rather than leaving the UI in a state it can't explain. */
  const markRead = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      api.markNotificationRead(id).catch(() => {
        load();
      });
    },
    [load],
  );

  return {
    today: items.filter((n) => isToday(n.createdAt)),
    earlier: items.filter((n) => !isToday(n.createdAt)),
    unreadCount: items.filter((n) => !n.readAt).length,
    loading,
    error,
    markRead,
    reload: load,
  };
}
