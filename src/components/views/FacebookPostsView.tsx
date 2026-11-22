import React, { useEffect, useState } from 'react';
import { AlertTriangle, Facebook, Info, Instagram, Loader2, Plus } from 'lucide-react';
import * as api from '../../lib/api';
import { ViewType } from '../../types';
import { openPostComposer } from '../../lib/socialPosts';
import { ChannelDrafts } from '../social/ChannelDrafts';
import { ConnectGuideLink } from '../social/ConnectHelp';
import { SocialPostList, postMedia, postText, usePlatformPosts } from '../social/SocialPostList';

type MetaChannel = 'facebook' | 'instagram';

/** What differs between the Facebook and the Instagram page; both connect through Facebook's sign-in. */
const CHANNEL = {
  facebook: {
    name: 'Facebook',
    Icon: Facebook,
    tile: 'bg-[#1877F2]',
    button: 'bg-[#1877F2] hover:bg-[#1668d6]',
    ring: 'ring-[#1877F2]',
    fallbackLabel: 'Facebook Page',
    readyNote: 'Connected · ready to post videos',
    connectTitle: 'Connect your Facebook Page',
    connectNote: 'Post videos from your Gallery to your Page, now or at a time you pick.',
    info: 'Facebook posts from Lumora are videos for now: write your text, pick a video from your Gallery, then post now or schedule.',
    viewLabel: 'View on Facebook',
  },
  instagram: {
    name: 'Instagram',
    Icon: Instagram,
    tile: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    button: 'bg-[#E1306C] hover:bg-[#c92a60]',
    ring: 'ring-[#E1306C]',
    fallbackLabel: 'Instagram account',
    readyNote: 'Connected · ready to post Reels',
    connectTitle: 'Connect your Instagram account',
    connectNote:
      'Your Instagram must be a professional account (Business or Creator) linked to your Facebook Page. Connecting Facebook connects both.',
    info: 'Instagram posts from Lumora are Reels: write your caption, pick a video from your Gallery, then post now or schedule. Vertical 9:16 videos fill the screen.',
    viewLabel: 'View on Instagram',
  },
} as const;

/**
 * Facebook Posts and Instagram (sidebar, under Published): the workspace's connection and its posts by status
 * (SocialPostList), with a New post button (the shared composer, src/components/PostComposer.tsx, in that mode).
 * Both take videos only from Lumora; Instagram posts them as Reels. Both connect through Facebook's sign-in, which
 * also picks up the Instagram professional account linked to the Page.
 */
const MetaPostsView: React.FC<{ channel: MetaChannel; onNavigate: (view: ViewType) => void }> = ({
  channel,
  onNavigate,
}) => {
  const look = CHANNEL[channel];
  const [status, setStatus] = useState<api.SocialConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { posts, error: postsError, reload } = usePlatformPosts(channel);

  useEffect(() => {
    let cancelled = false;
    api
      .getSocialConnectionStatus()
      .then((connections) => {
        if (!cancelled) setStatus(connections[channel] ?? { connected: false });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus({ connected: false });
        setError(err instanceof api.ApiError ? err.message : `Could not check your ${look.name} connection.`);
      });
    return () => {
      cancelled = true;
    };
  }, [channel, look.name]);

  const ready = !!status?.connected && !status.expired;

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      // Meta's sign-in sends the browser back to Integrations.
      window.location.href = await api.getMetaConnectUrl();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : `Could not start connecting ${look.name}. Please try again.`);
      setConnecting(false);
    }
  };

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const shownError = error ?? postsError;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className={`${card} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-12 h-12 rounded-xl ${look.tile} text-white flex items-center justify-center shrink-0`}>
            <look.Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            {status === null ? (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking your {look.name} connection...
              </p>
            ) : ready ? (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{status.label || look.fallbackLabel}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{look.readyNote}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {status.connected ? `Your ${look.name} connection has run out` : look.connectTitle}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{look.connectNote}</p>
                <ConnectGuideLink guide="facebook-instagram" />
              </>
            )}
          </div>
        </div>
        {status !== null && (
          <div className="flex items-center gap-2 shrink-0">
            {ready ? (
              <button
                type="button"
                onClick={() => openPostComposer({ platform: channel })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${look.button} text-white text-xs font-bold shadow-sm`}
              >
                <Plus className="w-4 h-4" /> New post
              </button>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${look.button} text-white text-xs font-bold shadow-sm disabled:opacity-60`}
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <look.Icon className="w-4 h-4" />}
                {status.connected ? `Reconnect ${look.name}` : `Connect ${look.name}`}
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
        <p className="text-[11px] leading-snug">{look.info}</p>
      </div>

      <ChannelDrafts channel={channel} posts={posts} onNavigate={onNavigate} />

      <SocialPostList
        posts={posts}
        canPost={ready}
        accentButton={look.button}
        accentRing={look.ring}
        newLabel="New post"
        onNew={() => openPostComposer({ platform: channel })}
        onRetry={({ content }) =>
          openPostComposer({ platform: channel, text: postText(content), media: postMedia(content) })
        }
        viewLabel={look.viewLabel}
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

export const FacebookPostsView: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => (
  <MetaPostsView channel="facebook" onNavigate={onNavigate} />
);

export const InstagramPostsView: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => (
  <MetaPostsView channel="instagram" onNavigate={onNavigate} />
);
