import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { NOTIF_EARLIER, NOTIF_TODAY } from './mockMobileData';

interface NotificationsOverlayProps {
  onClose: () => void;
}

export const NotificationsOverlay: React.FC<NotificationsOverlayProps> = ({ onClose }) => {
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

        <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2.5">Today</div>
        <div className="flex flex-col gap-2.5 mb-[22px]">
          {NOTIF_TODAY.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-100">
              <div className={`w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-none ${n.iconBg}`}>{n.icon}</div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-slate-900 leading-snug">{n.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{n.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2.5">Earlier</div>
        <div className="flex flex-col gap-2.5">
          {NOTIF_EARLIER.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-100">
              <div className={`w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-none ${n.iconBg}`}>{n.icon}</div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-slate-900 leading-snug">{n.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
