import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, Loader2, Upload, Youtube } from 'lucide-react';
import * as api from '../../lib/api';
import { openYouTubeUpload } from '../../lib/socialPosts';
import { ViewType } from '../../types';
import { ChannelDrafts } from '../social/ChannelDrafts';
import { SocialPostList, postMedia, postText, usePlatformPosts } from '../social/SocialPostList';

/**
 * YouTube (sidebar, under Creation): the connected channel - with a live check that Google still accepts the stored
 * sign-in - an Upload video button (src/components/YouTubeUploader.tsx) and the workspace's YouTube uploads by status
 * (SocialPostList). The post's title is the video title; its text is the description.
 */
export const YouTubePostsView: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const [connection, setConnection] = useState<api.YouTubeConnectionCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { posts, error: postsError, reload } = usePlatformPosts('youtube');

  useEffect(() => {
    let cancelled = false;
    // Google sends the browser back here after connecting; drop its one-time flags from the address.
    const params = new URLSearchParams(window.location.search);
    const connectError = params.get('youtube_error');
    if (params.has('youtube_connected') || connectError) {
      if (connectError) setError(`YouTube was not connected: ${connectError}`);
      params.delete('youtube_connected');
      params.delete('youtube_error');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }
    api
      .checkYouTubeConnection()
      .then((check) => {
        if (!cancelled) setConnection(check);
      })
      .catch((err) => {
        if (cancelled) return;
        setConnection({ connected: false });
        setError(err instanceof api.ApiError ? err.message : 'Could not check your YouTube channel.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = !!connection?.connected && !!connection.working;

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      window.location.href = await api.getYouTubeConnectUrl('youtube-posts');
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not start connecting YouTube. Please try again.');
      setConnecting(false);
    }
  };

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const shownError = error ?? postsError;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Channel */}
      <div className={`${card} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
            <Youtube className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            {connection === null ? (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking your YouTube channel...
              </p>
            ) : ready ? (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {connection.channelTitle || 'YouTube channel'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connected · ready to upload</p>
              </>
            ) : connection.connected ? (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {connection.channelTitle || 'YouTube channel'}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {connection.problem ?? 'The connection needs renewing.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Connect your YouTube channel</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload videos from your Gallery to your channel, now or at a time you pick.
                </p>
              </>
            )}
          </div>
        </div>
        {connection !== null && (
          <div className="flex items-center gap-2 shrink-0">
            {ready && (
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Change channel
              </button>
            )}
            <button
              type="button"
              onClick={ready ? () => openYouTubeUpload() : connect}
              disabled={connecting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ready ? (
                <Upload className="w-4 h-4" />
              ) : (
                <Youtube className="w-4 h-4" />
              )}
              {ready ? 'Upload video' : connection.connected ? 'Reconnect YouTube' : 'Connect YouTube'}
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

      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-snug">
          Until Google approves Lumora&apos;s YouTube access (an audit Google runs for apps that upload videos), YouTube
          keeps videos uploaded from here private, whatever visibility you pick. Vertical videos of up to 3 minutes
          appear as Shorts.
        </p>
      </div>

      <ChannelDrafts channel="youtube" posts={posts} onNavigate={onNavigate} />

      <SocialPostList
        posts={posts}
        canPost={ready}
        accentButton="bg-red-600 hover:bg-red-500"
        accentRing="ring-red-600"
        newLabel="Upload video"
        onNew={() => openYouTubeUpload()}
        onRetry={({ content }) =>
          openYouTubeUpload({ media: postMedia(content), title: content?.title, description: postText(content) })
        }
        viewLabel="Watch on YouTube"
        showTitle
        emptyText={{
          scheduled: 'Nothing scheduled. Upload a video and pick a time, and it waits here.',
          published: 'No videos yet. Your first upload will show up here.',
          failed: 'No failed uploads.',
        }}
        onChanged={reload}
        onError={setError}
      />

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Videos go to the channel connected above, for everyone in this workspace. Also in the{' '}
        <button type="button" onClick={() => onNavigate('calendar')} className="font-semibold underline">
          Calendar
        </button>
        .
      </p>
    </div>
  );
};
