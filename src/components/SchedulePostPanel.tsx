import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Facebook,
  Hash,
  Instagram,
  Linkedin,
  Loader2,
  X,
  Youtube,
} from 'lucide-react';
import * as api from '../lib/api';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';

type ScheduleState = 'idle' | 'scheduling' | 'scheduled' | 'error';

const SOCIAL_PLATFORM_OPTIONS: { id: api.SocialPlatform; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'facebook', label: 'Facebook Page', icon: Facebook },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
];

/** Local <input type="datetime-local"> minimum - 5 minutes from now, in the
 * "YYYY-MM-DDTHH:mm" shape that input expects, computed from local time. */
function minScheduleInputValue(): string {
  const d = new Date(Date.now() + 5 * 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Facebook/Instagram have no separate "hashtags" field on the Graph API -
 * a video's hashtags are just plain text inside its caption/description, so
 * this appends the hashtags the user typed into their own field onto the
 * caption before it's sent, normalizing each into a valid "#tag" token. */
function appendHashtagsToCaption(caption: string, hashtagsRaw: string): string {
  const tags = hashtagsRaw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter(Boolean)
    .map((t) => `#${t}`);
  if (tags.length === 0) return caption;
  const trimmedCaption = caption.trim();
  return trimmedCaption ? `${trimmedCaption}\n\n${tags.join(' ')}` : tags.join(' ');
}

interface SchedulePostPanelProps {
  /** The finished video, ready to upload - null/undefined disables the trigger. */
  finalVideoUrl: string | null | undefined;
  /** Pre-fills the caption box the first time the panel opens. */
  defaultCaption?: string;
  onNavigate: (view: ViewType) => void;
}

/** Drop-in "Schedule Post" button + panel + "Your Scheduled Posts" list,
 * wired to the real Video Studio -> Publishing Jobs -> Meta Graph API
 * pipeline. Shared between Video Studio and Character Studio so the two
 * don't drift out of sync with two copies of the same ~250 lines. */
export const SchedulePostPanel: React.FC<SchedulePostPanelProps> = ({
  finalVideoUrl,
  defaultCaption,
  onNavigate,
}) => {
  const { user } = useAuth();

  const [connectionStatus, setConnectionStatus] = useState<Record<
    api.SocialPlatform,
    api.SocialConnectionStatus
  > | null>(null);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [schedulePlatform, setSchedulePlatform] = useState<api.SocialPlatform>('facebook');
  const [scheduleCaption, setScheduleCaption] = useState('');
  const [scheduleHashtags, setScheduleHashtags] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleState, setScheduleState] = useState<ScheduleState>('idle');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<api.PublishingJob[]>([]);

  const refreshScheduledPosts = () => {
    api
      .listScheduledPosts()
      .then(setScheduledPosts)
      .catch(() => undefined);
  };

  useEffect(() => {
    api
      .getSocialConnectionStatus()
      .then(setConnectionStatus)
      .catch(() =>
        setConnectionStatus({
          facebook: { connected: false },
          instagram: { connected: false },
          linkedin: { connected: false },
          youtube: { connected: false },
        }),
      );
    refreshScheduledPosts();
  }, []);

  const handleOpenSchedulePanel = () => {
    if (!scheduleCaption.trim() && defaultCaption) {
      setScheduleCaption(defaultCaption.trim());
    }
    if (!scheduleAt) {
      setScheduleAt(minScheduleInputValue());
    }
    setScheduleState('idle');
    setScheduleError(null);
    setShowSchedulePanel((v) => !v);
  };

  const handleSchedule = async () => {
    if (!finalVideoUrl || !scheduleAt) return;
    if (!user?.organizationId || !user?.workspaceId) {
      setScheduleState('error');
      setScheduleError('Your account has no active organization/workspace to schedule posts under.');
      return;
    }

    setScheduleState('scheduling');
    setScheduleError(null);
    try {
      const videoBlob = await fetch(finalVideoUrl).then((r) => r.blob());
      await api.schedulePost({
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        videoBlob,
        caption: appendHashtagsToCaption(scheduleCaption, scheduleHashtags),
        platform: schedulePlatform,
        scheduledAt: new Date(scheduleAt).toISOString(),
      });
      setScheduleState('scheduled');
      refreshScheduledPosts();
    } catch (err) {
      setScheduleState('error');
      setScheduleError(
        err instanceof api.ApiError ? err.message : 'Could not schedule this post. Please try again.',
      );
    }
  };

  const handleCancelScheduledPost = async (id: string) => {
    try {
      await api.cancelScheduledPost(id);
      setScheduledPosts((prev) => prev.filter((job) => job.id !== id));
    } catch {
      // Best-effort - the list will self-correct on the next refresh.
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleOpenSchedulePanel}
        disabled={!finalVideoUrl}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Calendar className="w-4 h-4" />
        <span>Schedule Post</span>
      </button>

      {showSchedulePanel && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Clock className="w-3.5 h-3.5" /> Schedule automated posting
            </div>
            <button
              onClick={() => setShowSchedulePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {scheduleState === 'scheduled' ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4 shrink-0" />
              Scheduled - Lumora will post this automatically at the chosen time.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_PLATFORM_OPTIONS.map(({ id, label, icon: Icon }) => {
                  const platformStatus = connectionStatus?.[id];
                  const connected = !!platformStatus?.connected;
                  const isActive = schedulePlatform === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!connected}
                      onClick={() => setSchedulePlatform(id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                      {!connected && <span className="ml-auto text-[9px] font-semibold">Not connected</span>}
                    </button>
                  );
                })}
              </div>

              {connectionStatus && !connectionStatus[schedulePlatform]?.connected && (
                <button
                  type="button"
                  onClick={() => onNavigate('integrations')}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Connect {SOCIAL_PLATFORM_OPTIONS.find((p) => p.id === schedulePlatform)?.label} in
                  Integrations →
                </button>
              )}

              <textarea
                rows={2}
                value={scheduleCaption}
                onChange={(e) => setScheduleCaption(e.target.value)}
                placeholder="Caption for the post..."
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />

              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={scheduleHashtags}
                  onChange={(e) => setScheduleHashtags(e.target.value)}
                  placeholder="Hashtags (e.g. ai marketing contentcreation)"
                  className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              {scheduleHashtags.trim() && (
                <p className="text-[10px] text-slate-400 -mt-1 px-1">
                  Appended to the caption: {appendHashtagsToCaption('', scheduleHashtags)}
                </p>
              )}

              <input
                type="datetime-local"
                value={scheduleAt}
                min={minScheduleInputValue()}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />

              {scheduleState === 'error' && scheduleError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-snug">{scheduleError}</p>
                </div>
              )}

              <button
                onClick={handleSchedule}
                disabled={
                  scheduleState === 'scheduling' ||
                  !scheduleAt ||
                  !connectionStatus?.[schedulePlatform]?.connected
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {scheduleState === 'scheduling' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                <span>Confirm Schedule</span>
              </button>
            </>
          )}
        </div>
      )}

      {(scheduledPosts?.length ?? 0) > 0 && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Scheduled Posts</h3>
          {scheduledPosts.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                  {job.platform}
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      job.status === 'published'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : job.status === 'failed'
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                    }`}
                  >
                    {job.status}
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : '—'}
                </p>
              </div>
              {job.status === 'scheduled' && (
                <button
                  onClick={() => handleCancelScheduledPost(job.id)}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
