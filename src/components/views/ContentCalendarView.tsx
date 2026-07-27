import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Filter,
  Kanban,
  Plus,
  Share2,
  X,
} from 'lucide-react';
import { CalendarEvent, ViewType } from '../../types';

interface ContentCalendarViewProps {
  events: CalendarEvent[];
  onNavigate: (view: ViewType) => void;
  onUpdateEvents: (newEvents: CalendarEvent[]) => void;
}

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({
  events,
  onNavigate,
  onUpdateEvents,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'kanban'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newEvent, setNewEvent] = useState<{
    title: string;
    platform: CalendarEvent['platform'];
    contentType: string;
    scheduledTime: string;
    author: string;
    previewText: string;
  }>({
    title: '',
    platform: 'LinkedIn',
    contentType: 'Post',
    scheduledTime: 'Tomorrow, 10:00 AM',
    author: 'Alex Rivera',
    previewText: '',
  });

  const statuses: CalendarEvent['status'][] = ['Draft', 'Review', 'Approved', 'Published', 'Rejected'];

  const handleStatusChange = (eventId: string, newStatus: CalendarEvent['status']) => {
    const updated = events.map((ev) => (ev.id === eventId ? { ...ev, status: newStatus } : ev));
    onUpdateEvents(updated);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) return;
    const created: CalendarEvent = {
      id: `cal-${Date.now()}`,
      title: newEvent.title,
      platform: newEvent.platform,
      contentType: newEvent.contentType,
      scheduledTime: newEvent.scheduledTime,
      status: 'Approved',
      author: newEvent.author,
      previewText: newEvent.previewText,
    };
    onUpdateEvents([...events, created]);
    setShowAddModal(false);
    setNewEvent({
      title: '',
      platform: 'LinkedIn',
      contentType: 'Post',
      scheduledTime: 'Tomorrow, 10:00 AM',
      author: 'Alex Rivera',
      previewText: '',
    });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" /> Kanban Workflow
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'month'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Calendar Schedule
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Schedule Content
        </button>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4 custom-scroll">
          {statuses.map((status) => {
            const statusEvents = events.filter((e) => e.status === status);
            return (
              <div
                key={status}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col min-w-[240px]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {status}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {statusEvents.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] custom-scroll">
                  {statusEvents.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No posts in {status}
                    </div>
                  ) : (
                    statusEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs hover:border-blue-500/50 transition-all space-y-2 group"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                            {ev.platform}
                          </span>
                          <span className="text-slate-400">{ev.contentType}</span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                          {ev.title}
                        </h4>

                        {ev.previewText && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {ev.previewText}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {ev.scheduledTime}
                          </span>

                          {/* Quick Status Shift */}
                          <select
                            value={ev.status}
                            onChange={(e) => handleStatusChange(ev.id, e.target.value as CalendarEvent['status'])}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] rounded px-1.5 py-0.5 outline-none font-semibold cursor-pointer"
                          >
                            {statuses.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MONTHLY CALENDAR GRID VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const dayEvents = events.filter((e) => e.scheduledTime.includes(`Jul ${dayNum}`) || (dayNum === 27 && e.scheduledTime.includes('Today')) || (dayNum === 28 && e.scheduledTime.includes('Tomorrow')));
              return (
                <div
                  key={i}
                  className="min-h-[100px] p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-slate-400">{dayNum}</span>
                  <div className="space-y-1 my-1">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-1 rounded bg-blue-600 text-white text-[10px] font-semibold truncate"
                        title={ev.title}
                      >
                        {ev.platform}: {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD SCHEDULE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule New Content</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Post Headline / Title
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. AI Content OS Demo"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                    Platform
                  </label>
                  <select
                    value={newEvent.platform}
                    onChange={(e) => setNewEvent({ ...newEvent, platform: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Twitter/X">Twitter/X</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Newsletter">Newsletter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={newEvent.scheduledTime}
                    onChange={(e) => setNewEvent({ ...newEvent, scheduledTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Content Preview Text
                </label>
                <textarea
                  rows={3}
                  value={newEvent.previewText}
                  onChange={(e) => setNewEvent({ ...newEvent, previewText: e.target.value })}
                  placeholder="Post copy preview..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm"
              >
                Confirm & Add to Calendar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
