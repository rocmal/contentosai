import React, { useEffect, useState } from 'react';
import { AlertTriangle, Linkedin, Loader2, Plus } from 'lucide-react';
import * as api from '../../lib/api';
import { openPostComposer } from '../../lib/socialPosts';
import { ViewType } from '../../types';
import { SocialPostList, postMedia, postText, usePlatformPosts } from '../social/SocialPostList';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * LinkedIn Posts (sidebar, under Creation): the workspace's LinkedIn connection, a New post button (the shared
 * composer, src/components/PostComposer.tsx) and its LinkedIn posts by status (SocialPostList) - edit or cancel a
 * scheduled one, open a published one on LinkedIn, see why one failed and try it again. Posting goes to the connected
 * member's personal profile.
 */
export const LinkedInPostsView: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const [status, setStatus] = useState<api.SocialConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { posts, error: postsError, reload } = usePlatformPosts('linkedin');

  useEffect(() => {
    let cancelled = false;
    api
      .getSocialConnectionStatus()
      .then((connections) => {
        if (!cancelled) setStatus(connections.linkedin ?? { connected: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus({ connected: false });
        setError(err instanceof api.ApiError ? err.message : 'Could not check your LinkedIn connection.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const shownError = error ?? postsError;

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

      {shownError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs leading-snug">{shownError}</p>
        </div>
      )}

      <SocialPostList
        posts={posts}
        canPost={ready}
        accentButton="bg-[#0A66C2] hover:bg-[#09579f]"
        accentRing="ring-[#0A66C2]"
        newLabel="New post"
        onNew={() => openPostComposer()}
        onRetry={({ content }) => openPostComposer({ text: postText(content), media: postMedia(content) })}
        viewLabel="View on LinkedIn"
        emptyText={{
          scheduled: 'Nothing scheduled. Write a post and pick a time, and it waits here.',
          published: 'No posts yet. Your first post will show up here.',
          failed: 'No failed posts.',
        }}
        onChanged={reload}
        onError={setError}
      />

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Posts go to the personal profile connected above; whoever connects it, every post from this workspace goes to
        their profile. LinkedIn shows the first few lines and a "...more" link, so lead with the point. Also in the{' '}
        <button type="button" onClick={() => onNavigate('calendar')} className="font-semibold underline">
          Calendar
        </button>
        .
      </p>
    </div>
  );
};
