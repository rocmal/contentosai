import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Linkedin,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import * as api from '../../lib/api';
import { ComposerMedia, openPostComposer, useOnPostCreated } from '../../lib/socialPosts';
import { ViewType } from '../../types';
import { CalendarPost, EditPostModal } from './ContentCalendarView';

type Tab = 'scheduled' | 'published' | 'failed';

const TABS: { id: Tab; label: string; empty: string }[] = [
  { id: 'scheduled', label: 'Scheduled', empty: 'Nothing scheduled. Write a post and pick a time, and it waits here.' },
  { id: 'published', label: 'Published', empty: 'No posts yet. Your first post will show up here.' },
  { id: 'failed', label: 'Failed', empty: 'No failed posts.' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const formatWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** The post text as written in the composer (older posts only have the body). */
const postText = (content: api.ContentItem | null) => content?.metadata?.caption ?? content?.body ?? '';

/** The Gallery item a post carried, so "Try again" can attach it again. */
function postMedia(content: api.ContentItem | null): ComposerMedia | undefined {
  const meta = content?.metadata;
  if (!meta?.mediaAssetId) return undefined;
  if (meta.imageUrl) return { assetId: meta.mediaAssetId, type: 'image', url: meta.imageUrl };
  if (meta.videoUrl) return { assetId: meta.mediaAssetId, type: 'video', url: meta.videoUrl };
  return undefined;
}

/**
 * LinkedIn Posts (sidebar, under Creation): the workspace's LinkedIn connection, a New post button (the shared
 * composer, src/components/PostComposer.tsx) and its LinkedIn posts by status - edit or cancel a scheduled one,
 * open a published one on LinkedIn, try a failed one again. Posting goes to the connected member's personal profile.
 */
export const LinkedInPostsView: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const [status, setStatus] = useState<api.SocialConnectionStatus | null>(null);
  const [posts, setPosts] = useState<CalendarPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [editing, setEditing] = useState<CalendarPost | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [connections, jobs, contents] = await Promise.all([
        api.getSocialConnectionStatus(),
        api.listScheduledPosts(),
        api.listContent(),
      ]);
      const contentById = new Map(contents.map((c) => [c.id, c]));
      setStatus(connections.linkedin ?? { connected: false });
      setPosts(
        jobs
          .filter((job) => job.platform === 'linkedin')
          .map((job) => ({ job, content: job.contentId ? contentById.get(job.contentId) ?? null : null })),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not load your LinkedIn posts. Please try again.');
      setPosts((previous) => previous ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useOnPostCreated(load);

  const byTab = useMemo(() => {
    const all = posts ?? [];
    const time = (p: CalendarPost) => new Date(p.job.publishedAt ?? p.job.scheduledAt ?? 0).getTime();
    return {
      scheduled: all.filter((p) => p.job.status === 'scheduled').sort((a, b) => time(a) - time(b)),
      published: all.filter((p) => p.job.status === 'published').sort((a, b) => time(b) - time(a)),
      failed: all.filter((p) => p.job.status === 'failed').sort((a, b) => time(b) - time(a)),
    };
  }, [posts]);

  // Open on whatever has something in it, scheduled first.
  const activeTab: Tab = tab ?? (byTab.scheduled.length ? 'scheduled' : byTab.failed.length ? 'failed' : 'published');
  const ready = !!status?.connected && !status.expired;
  const expiresAt = status?.expiresAt ? new Date(status.expiresAt) : null;
  const expiresSoon = ready && !!expiresAt && expiresAt.getTime() - Date.now() < 7 * DAY_MS;

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      // LinkedIn's sign-in sends the browser back to Integrations.
      window.location.href = await api.getLinkedInConnectUrl();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not start connecting LinkedIn. Please try again.');
      setConnecting(false);
    }
  };

  const cancelPost = async (id: string) => {
    setBusyId(id);
    try {
      await api.cancelScheduledPost(id);
      setConfirmCancelId(null);
      await load();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not cancel the post. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Account */}
      <div className={`${card} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0">
            <Linkedin className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            {status === null ? (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking your LinkedIn connection...
              </p>
            ) : ready ? (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{status.label || 'LinkedIn profile'}</p>
                <p className={`text-xs ${expiresSoon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  Connected · personal profile
                  {expiresAt && ` · reconnect by ${formatDate(expiresAt.toISOString())}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {status.connected ? 'Your LinkedIn connection has run out' : 'Connect your LinkedIn profile'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {status.connected
                    ? 'LinkedIn sign-ins last 60 days. Reconnect to keep posting; scheduled posts keep their times.'
                    : 'Post text, a picture or a video from your Gallery to your profile, now or at a time you pick.'}
                </p>
              </>
            )}
          </div>
        </div>
        {status !== null && (
          <div className="flex items-center gap-2 shrink-0">
            {ready && (
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Reconnect
              </button>
            )}
            <button
              type="button"
              onClick={ready ? () => openPostComposer() : connect}
              disabled={connecting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#09579f] text-white text-xs font-bold shadow-sm disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ready ? (
                <Plus className="w-4 h-4" />
              ) : (
                <Linkedin className="w-4 h-4" />
              )}
              {ready ? 'New post' : status.connected ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs leading-snug">{error}</p>
        </div>
      )}

      {/* Counts double as tabs */}
      <div className="grid grid-cols-3 gap-3">
        {TABS.map(({ id, label }) => {
          const count = byTab[id].length;
          const on = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={on}
              className={`${card} p-4 text-left transition-colors ${on ? 'ring-2 ring-[#0A66C2] border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
              <p className={`text-2xl font-bold ${id === 'failed' && count > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                {posts === null ? '–' : count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Posts */}
      <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
        {posts === null ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : byTab[activeTab].length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{TABS.find((t) => t.id === activeTab)!.empty}</p>
            {ready && activeTab !== 'failed' && (
              <button
                type="button"
                onClick={() => openPostComposer()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#09579f] text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> New post
              </button>
            )}
          </div>
        ) : (
          byTab[activeTab].map((post) => {
            const { job, content } = post;
            const text = postText(content);
            const media = postMedia(content);
            return (
              <div key={job.id} className="p-4 flex gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                  {media?.type === 'image' ? (
                    <img src={media.url} alt="" className="w-full h-full object-cover" />
                  ) : media?.type === 'video' ? (
                    <video src={`${media.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover bg-black" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words line-clamp-3">
                    {text || <span className="italic text-slate-400">No text</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    {job.status === 'scheduled' && (
                      <>
                        <CalendarClock className="w-3.5 h-3.5" /> Posts {formatWhen(job.scheduledAt)}
                      </>
                    )}
                    {job.status === 'published' && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Posted {formatWhen(job.publishedAt ?? job.scheduledAt)}
                      </>
                    )}
                    {job.status === 'failed' && (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Did not post ({formatWhen(job.scheduledAt)}). The
                        reason is in your notifications.
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {job.status === 'scheduled' &&
                      (confirmCancelId === job.id ? (
                        <>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cancel this post?</span>
                          <button
                            type="button"
                            onClick={() => cancelPost(job.id)}
                            disabled={busyId === job.id}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold disabled:opacity-60"
                          >
                            {busyId === job.id ? 'Cancelling...' : 'Yes, cancel it'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Keep it
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(post)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(job.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-3 h-3" /> Cancel
                          </button>
                        </>
                      ))}
                    {job.status === 'published' && job.permalink && (
                      <a
                        href={job.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-[#0A66C2] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3 h-3" /> View on LinkedIn
                      </a>
                    )}
                    {job.status !== 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => openPostComposer({ text, media })}
                        disabled={!ready}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" /> {job.status === 'failed' ? 'Try again' : 'Post again'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Posts go to the personal profile connected above; whoever connects it, every post from this workspace goes to
        their profile. LinkedIn shows the first few lines and a "...more" link, so lead with the point. Also in the{' '}
        <button type="button" onClick={() => onNavigate('calendar')} className="font-semibold underline">
          Calendar
        </button>
        .
      </p>

      {editing && (
        <EditPostModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
};
