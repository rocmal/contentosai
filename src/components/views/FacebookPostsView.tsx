import React, { useEffect, useState } from 'react';
import { AlertTriangle, Facebook, Info, Loader2, Plus } from 'lucide-react';
import * as api from '../../lib/api';
import { ViewType } from '../../types';
import { openPostComposer } from '../../lib/socialPosts';
import { ChannelDrafts } from '../social/ChannelDrafts';
import { SocialPostList, postMedia, postText, usePlatformPosts } from '../social/SocialPostList';

/**
 * Facebook Posts (sidebar, under Published): the workspace's Facebook Page connection and its Facebook posts by status
 * (SocialPostList), with a New post button (the shared composer, src/components/PostComposer.tsx, in Facebook mode).
 * Facebook takes videos only from Lumora today.
 */
export const FacebookPostsView: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const [status, setStatus] = useState<api.SocialConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { posts, error: postsError, reload } = usePlatformPosts('facebook');

  useEffect(() => {
    let cancelled = false;
    api
      .getSocialConnectionStatus()
      .then((connections) => {
        if (!cancelled) setStatus(connections.facebook ?? { connected: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus({ connected: false });
        setError(err instanceof api.ApiError ? err.message : 'Could not check your Facebook connection.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = !!status?.connected && !status.expired;

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      // Meta's sign-in sends the browser back to Integrations.
      window.location.href = await api.getMetaConnectUrl();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not start connecting Facebook. Please try again.');
      setConnecting(false);
    }
  };

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const shownError = error ?? postsError;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className={`${card} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0">
            <Facebook className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            {status === null ? (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking your Facebook connection...
              </p>
            ) : ready ? (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{status.label || 'Facebook Page'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connected · ready to post videos</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {status.connected ? 'Your Facebook connection has run out' : 'Connect your Facebook Page'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Post videos from your Gallery to your Page, now or at a time you pick.
                </p>
              </>
            )}
          </div>
        </div>
        {status !== null && (
          <div className="flex items-center gap-2 shrink-0">
            {ready ? (
              <button
                type="button"
                onClick={() => openPostComposer({ platform: 'facebook' })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#1668d6] text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> New post
              </button>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#1668d6] text-white text-xs font-bold shadow-sm disabled:opacity-60"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
                {status.connected ? 'Reconnect Facebook' : 'Connect Facebook'}
              </button>
            )}
          </div>
        )}
      </div>

      {shownError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs leading-snug">{shownError}</p>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-snug">
          Facebook posts from Lumora are videos for now: write your text, pick a video from your Gallery, then post now or schedule.
        </p>
      </div>

      <ChannelDrafts channel="facebook" posts={posts} onNavigate={onNavigate} />

      <SocialPostList
        posts={posts}
        canPost={ready}
        accentButton="bg-[#1877F2] hover:bg-[#1668d6]"
        accentRing="ring-[#1877F2]"
        newLabel="New post"
        onNew={() => openPostComposer({ platform: 'facebook' })}
        onRetry={({ content }) =>
          openPostComposer({ platform: 'facebook', text: postText(content), media: postMedia(content) })
        }
        viewLabel="View on Facebook"
        emptyText={{
          scheduled: 'Nothing scheduled. Write a post and pick a time, and it waits here.',
          published: 'No posts yet. Your first post will show up here.',
          failed: 'No failed posts.',
        }}
        onChanged={reload}
        onError={setError}
      />
    </div>
  );
};
