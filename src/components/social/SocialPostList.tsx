import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import * as api from '../../lib/api';
import { ComposerMedia, useOnPostCreated } from '../../lib/socialPosts';
import { CalendarPost, EditPostModal } from '../views/ContentCalendarView';

type Tab = 'scheduled' | 'published' | 'failed';

export const formatWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

/** The post text as written (older posts only have the body). For YouTube it is the description. */
export const postText = (content: api.ContentItem | null) => content?.metadata?.caption ?? content?.body ?? '';

/** The Gallery item a post carried, so "Try again" can attach it again. */
export function postMedia(content: api.ContentItem | null): ComposerMedia | undefined {
  const meta = content?.metadata;
  if (!meta?.mediaAssetId) return undefined;
  if (meta.imageUrl) return { assetId: meta.mediaAssetId, type: 'image', url: meta.imageUrl };
  if (meta.videoUrl) return { assetId: meta.mediaAssetId, type: 'video', url: meta.videoUrl };
  return undefined;
}

/** One platform's posts (newest 50 jobs, joined with their content), reloaded after anything is posted. */
export function usePlatformPosts(platform: api.SocialPlatform): {
  posts: CalendarPost[] | null;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [posts, setPosts] = useState<CalendarPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [jobs, contents] = await Promise.all([api.listScheduledPosts(), api.listContent()]);
      const contentById = new Map(contents.map((c) => [c.id, c]));
      setPosts(
        jobs
          .filter((job) => job.platform === platform)
          .map((job) => ({ job, content: job.contentId ? contentById.get(job.contentId) ?? null : null })),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not load your posts. Please try again.');
      setPosts((previous) => previous ?? []);
    }
  }, [platform]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useOnPostCreated(reload);

  return { posts, error, reload };
}

interface SocialPostListProps {
  posts: CalendarPost[] | null;
  /** Connected and working: New / Try again are offered. */
  canPost: boolean;
  /** Button classes in the platform's colour, e.g. "bg-[#0A66C2] hover:bg-[#09579f]". */
  accentButton: string;
  /** Ring class for the chosen counter, e.g. "ring-[#0A66C2]". */
  accentRing: string;
  newLabel: string;
  onNew: () => void;
  onRetry: (post: CalendarPost) => void;
  /** "View on LinkedIn", "Watch on YouTube". */
  viewLabel: string;
  /** YouTube: show the post's title (the video title) above its text. */
  showTitle?: boolean;
  emptyText: Record<Tab, string>;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
}

/**
 * Counters that double as tabs (Scheduled / Published / Failed) and the posts under the chosen one: edit or cancel a
 * scheduled post, open a published one, see why a failed one did not go out and try it again. Used by LinkedIn Posts
 * and YouTube.
 */
export const SocialPostList: React.FC<SocialPostListProps> = ({
  posts,
  canPost,
  accentButton,
  accentRing,
  newLabel,
  onNew,
  onRetry,
  viewLabel,
  showTitle,
  emptyText,
  onChanged,
  onError,
}) => {
  const [tab, setTab] = useState<Tab | null>(null);
  const [editing, setEditing] = useState<CalendarPost | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const cancelPost = async (id: string) => {
    setBusyId(id);
    try {
      await api.cancelScheduledPost(id);
      setConfirmCancelId(null);
      await onChanged();
    } catch (err) {
      onError(err instanceof api.ApiError ? err.message : 'Could not cancel the post. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const tabs: { id: Tab; label: string }[] = [
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'published', label: 'Published' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {tabs.map(({ id, label }) => {
          const count = byTab[id].length;
          const on = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={on}
              className={`${card} p-4 text-left transition-colors ${on ? `ring-2 ${accentRing} border-transparent` : 'hover:border-slate-300 dark:hover:border-slate-700'}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
              <p className={`text-2xl font-bold ${id === 'failed' && count > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                {posts === null ? '–' : count}
              </p>
            </button>
          );
        })}
      </div>

      <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
        {posts === null ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : byTab[activeTab].length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText[activeTab]}</p>
            {canPost && activeTab !== 'failed' && (
              <button
                type="button"
                onClick={onNew}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold ${accentButton}`}
              >
                <Plus className="w-4 h-4" /> {newLabel}
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
                  {showTitle && content?.title && (
                    <p className="text-sm font-bold text-slate-900 dark:text-white break-words">{content.title}</p>
                  )}
                  <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words line-clamp-3">
                    {text || <span className="italic text-slate-400">{showTitle ? 'No description' : 'No text'}</span>}
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
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Did not post ({formatWhen(job.scheduledAt)})
                      </>
                    )}
                  </p>
                  {job.status === 'failed' && (
                    <p className="text-[11px] leading-snug px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 break-words">
                      {job.errorMessage || 'No reason was given. Check the notification for this post (the bell).'}
                    </p>
                  )}
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
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3 h-3" /> {viewLabel}
                      </a>
                    )}
                    {job.status !== 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => onRetry(post)}
                        disabled={!canPost}
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

      {editing && (
        <EditPostModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void onChanged();
          }}
        />
      )}
    </>
  );
};
