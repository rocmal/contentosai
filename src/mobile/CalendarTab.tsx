import React, { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { MobilePost } from './types';
import { getCurrentWeek } from './useMobilePosts';
import { platformLabel, platformTagClasses, statusClasses, statusLabel } from './postDisplay';

interface CalendarTabProps {
  posts: MobilePost[];
  postsLoading: boolean;
  onOpenCreate: () => void;
  onOpenPost: (post: MobilePost) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ posts, postsLoading, onOpenCreate, onOpenPost }) => {
  const week = getCurrentWeek();
  const [selected, setSelected] = useState(week.findIndex((d) => d.isToday));
  const day = week[selected];
  const dayPosts = posts.filter((p) => p.dateKey === day.key);

  return (
    <div className="px-5 pt-3.5 pb-6">
      <div className="flex items-center justify-between mb-[18px]">
        <h1 className="font-display text-[21px] text-slate-900 m-0">Content Calendar</h1>
        <button
          onClick={onOpenCreate}
          aria-label="Create"
          className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center"
        >
          <Plus className="w-[18px] h-[18px] text-white" />
        </button>
      </div>

      <div className="flex justify-between mb-4">
        {week.map((d, i) => {
          const active = i === selected;
          return (
            <button
              key={d.key}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center gap-1 py-2 rounded-2xl w-[38px] ${
                active ? 'bg-blue-600 text-white' : d.isToday ? 'bg-blue-100 text-slate-900' : 'text-slate-900'
              }`}
            >
              <span className="text-[10px] font-bold opacity-75">{d.label}</span>
              <span className="font-display text-sm">{d.date}</span>
            </button>
          );
        })}
      </div>

      <div className="text-[13px] font-bold text-slate-900 mb-3">{day.full}</div>

      {postsLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin mx-auto my-4" />}
      {!postsLoading && dayPosts.length === 0 && (
        <p className="text-[12.5px] text-slate-500">Nothing scheduled for this day.</p>
      )}
      <div className="flex flex-col gap-2">
        {dayPosts.map((item) => (
          <button
            key={item.id}
            onClick={() => onOpenPost(item)}
            className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-slate-100 text-left"
          >
            <div className="flex items-center justify-between">
              <span className={platformTagClasses}>{platformLabel(item.platform)}</span>
              <span className={statusClasses(item.status)}>{statusLabel(item.status)}</span>
            </div>
            <span className="text-[12.5px] font-bold text-slate-900">{item.title}</span>
            <span className="text-[11px] text-slate-500">{item.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
