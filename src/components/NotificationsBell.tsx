import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCircle2, Info } from 'lucide-react';
import * as api from '../lib/api';
import { ViewType } from '../types';

/** How often the unread count refreshes while the tab is visible. */
const REFRESH_MS = 60_000;

/** Where a notification opens. `link` is set by the server and shared with the phone app's push notifications. */
function viewFor(notification: api.AppNotification): ViewType | null {
  const link = typeof notification.metadata?.link === 'string' ? notification.metadata.link : null;
  if (link === 'calendar') return /linkedin/i.test(notification.title) ? 'linkedin-posts' : 'calendar';
  if (link === 'gallery') return 'media-library';
  if (link === 'video') return 'video-studio';
  if (link === 'integrations') return 'integrations';
  if (link === 'billing') return 'billing';
  return null;
}

function timeAgo(iso: string): string {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const TYPE_ICON: Record<api.NotificationType, { icon: React.FC<{ className?: string }>; className: string }> = {
  error: { icon: AlertTriangle, className: 'text-red-500' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  success: { icon: CheckCircle2, className: 'text-emerald-500' },
  info: { icon: Info, className: 'text-blue-500' },
};

/**
 * The header's bell: the signed-in person's notifications (video ready, post published or failed, LinkedIn
 * connection running out, ...) with an unread count. Until 2026-10-23 it was a placeholder that always said "You're
 * all caught up", so failure notices only reached the phone app.
 */
export const NotificationsBell: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<api.AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api
      .listMyNotifications({ limit: 15 })
      .then((result) => {
        setItems(result.items);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items?.filter((n) => !n.readAt) ?? [];

  const markRead = (notification: api.AppNotification) => {
    if (notification.readAt) return;
    const readAt = new Date().toISOString();
    setItems((previous) => previous?.map((n) => (n.id === notification.id ? { ...n, readAt } : n)) ?? previous);
    api.markNotificationRead(notification.id).catch(() => undefined);
  };

  const openItem = (notification: api.AppNotification) => {
    markRead(notification);
    const view = viewFor(notification);
    if (view) {
      setOpen(false);
      onNavigate(view);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
        title="Notifications"
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold leading-4 text-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Notifications</span>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => unread.forEach(markRead)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {failed && !items ? (
            <p className="px-3 py-8 text-center text-[11px] text-slate-400">Could not load notifications.</p>
          ) : items === null ? (
            <p className="px-3 py-8 text-center text-[11px] text-slate-400">Loading...</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <BellOff className="w-5 h-5 text-slate-300 dark:text-slate-600" />
              <p className="text-[11px] text-slate-400">You're all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((notification) => {
                const { icon: Icon, className } = TYPE_ICON[notification.type] ?? TYPE_ICON.info;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openItem(notification)}
                      className={`w-full text-left flex gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                        notification.readAt ? '' : 'bg-blue-50/60 dark:bg-blue-950/20'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${className}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {notification.title}
                          </span>
                          {!notification.readAt && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                        </span>
                        <span className="block text-[11px] text-slate-600 dark:text-slate-300 break-words line-clamp-3">
                          {notification.message}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{timeAgo(notification.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
