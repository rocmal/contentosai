import React from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from 'lucide-react';
import { NotificationType } from '../lib/api';

/** The real API only carries a coarse `type` enum (info/warning/success/
 * error) - unlike the old mock data, which hand-picked a distinct icon per
 * sample notification for visual variety. This maps that enum to an icon +
 * tint, the same way postDisplay.ts maps MobilePost['status'] to a pill
 * style, so every screen renders notifications identically. */
export function notificationIcon(type: NotificationType): React.ReactElement {
  switch (type) {
    case 'success':
      return React.createElement(CheckCircle2, { className: 'w-4 h-4 text-emerald-600' });
    case 'warning':
      return React.createElement(AlertTriangle, { className: 'w-4 h-4 text-amber-600' });
    case 'error':
      return React.createElement(XCircle, { className: 'w-4 h-4 text-red-600' });
    default:
      return React.createElement(Info, { className: 'w-4 h-4 text-blue-700' });
  }
}

export function notificationIconBg(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'bg-emerald-50';
    case 'warning':
      return 'bg-amber-50';
    case 'error':
      return 'bg-red-50';
    default:
      return 'bg-blue-50';
  }
}

export const NOTIFICATION_BELL_ICON = React.createElement(Bell, { className: 'w-[17px] h-[17px] text-slate-900' });

/** Short relative label for a notification's createdAt - "2:31 PM" for
 * today, "Yesterday", "3 days ago", then a plain date further back. */
export function notificationTimeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAgo = Math.round((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / dayMs);
  if (daysAgo > 0 && daysAgo < 7) {
    return `${daysAgo} days ago`;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Same-calendar-day check used to split the Notifications screen into
 * "Today" vs "Earlier" sections. */
export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}
