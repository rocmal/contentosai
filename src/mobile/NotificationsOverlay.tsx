import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import * as api from '../lib/api';
import { notificationIcon, notificationIconBg, notificationTimeLabel } from './notificationDisplay';

interface NotificationsOverlayProps {
  today: api.AppNotification[];
  earlier: api.AppNotification[];
  loading: boolean;
  error: string | null;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: api.AppNotification;
  onMarkRead: (id: string) => void;
}) {
  const unread = !notification.readAt;
  return (
    <button
      onClick={() => unread && onMarkRead(notification.id)}
      className={`flex items-start gap-3 p-3 rounded-2xl text-left w-full ${unread ? 'bg-blue-50' : 'bg-slate-100'}`}
    >
      <div className={`w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-none ${notificationIconBg(notification.type)}`}>
        {notificationIcon(notification.type)}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-bold text-slate-900 leading-snug">{notification.title}</div>
        {notification.message && (
          <div className="text-[11.5px] text-slate-600 leading-snug mt-0.5">{notification.message}</div>
        )}
        <div className="text-[11px] text-slate-500 mt-0.5">{notificationTimeLabel(notification.createdAt)}</div>
      </div>
      {unread && <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-none" />}
    </button>
  );
}

export const NotificationsOverlay: React.FC<NotificationsOverlayProps> = ({
  today,
  earlier,
  loading,
  error,
  onMarkRead,
  onClose,
}) => {
  const empty = !loading && !error && today.length === 0 && earlier.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
      <div className="px-5 pt-3.5 pb-10">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-[34px] h-[34px] rounded-full bg-slate-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-[18px] h-[18px] text-slate-900" />
          </button>
          <h2 className="m-0 font-display text-xl text-slate-900">Notifications</h2>
        </div>

        {loading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto my-8" />}
        {!loading && error && <p className="text-[12.5px] text-red-600 text-center my-8">{error}</p>}
        {empty && <p className="text-[12.5px] text-slate-500 text-center my-8">You're all caught up.</p>}

        {!loading && !error && today.length > 0 && (
          <>
            <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2.5">Today</div>
            <div className="flex flex-col gap-2.5 mb-[22px]">
              {today.map((n) => (
                <NotificationRow key={n.id} notification={n} onMarkRead={onMarkRead} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && earlier.length > 0 && (
          <>
            <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2.5">Earlier</div>
            <div className="flex flex-col gap-2.5">
              {earlier.map((n) => (
                <NotificationRow key={n.id} notification={n} onMarkRead={onMarkRead} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
