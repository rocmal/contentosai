import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Film, Loader2, Sparkles, Upload, X, Youtube } from 'lucide-react';
import * as api from '../lib/api';
import { ViewType } from '../types';
import VoiceInputButton, { appendSpoken } from './VoiceInputButton';
import { useTextHistory } from '../lib/useTextHistory';
import {
  ComposerMedia,
  createSocialPost,
  useYouTubeUploadRequest,
  VideoVisibility,
  YouTubeUploadRequest,
  YOUTUBE_DESCRIPTION_BYTES,
  YOUTUBE_TITLE_LIMIT,
} from '../lib/socialPosts';

const DAY_MS = 24 * 60 * 60 * 1000;

const AI_SYSTEM_PROMPT =
  'You write YouTube titles and descriptions for a small business or professional in India (often an insurance ' +
  'advisor). Reply in exactly this form:\nTITLE: <a clear title of at most 90 characters>\nDESCRIPTION: <80-200 ' +
  'words: what the video shows, short paragraphs, a call to action, then 3 to 5 relevant hashtags on the last line>\n' +
  'Plain text only - no markdown. Do not invent facts, figures, returns, guarantees or claims; where a number is ' +
  'needed write a placeholder such as [premium].';

const VISIBILITY: { id: VideoVisibility; label: string; hint: string }[] = [
  { id: 'public', label: 'Public', hint: 'Anyone can find and watch it' },
  { id: 'unlisted', label: 'Unlisted', hint: 'Only people with the link' },
  { id: 'private', label: 'Private', hint: 'Only you' },
];

/** A datetime-local value ("2026-10-20T09:00") for a Date, in this computer's time. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tomorrowMorning(): string {
  const date = new Date(Date.now() + DAY_MS);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date);
}

const formatWhen = (date: Date) =>
  date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const byteLength = (text: string) => new TextEncoder().encode(text).length;

interface YouTubeUploaderProps {
  request: YouTubeUploadRequest;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
}

/**
 * "Upload to YouTube": one Gallery video, a title, a description (Speak / Write with AI), who can watch it, and now or
 * at a time. Opened with openYouTubeUpload() (src/lib/socialPosts.ts) from the YouTube page, Gallery videos, Video
 * Studio's finished screen, the Create menus and Ctrl+K. Goes through POST /publishing/posts with platforms
 * ['youtube']; the server checks it again and the worker uploads it (YouTubePublisherProvider).
 */
export const YouTubeUploader: React.FC<YouTubeUploaderProps> = ({ request, onClose, onNavigate }) => {
  const [connection, setConnection] = useState<api.YouTubeConnectionCheck | undefined>(undefined);
  const [connecting, setConnecting] = useState(false);
  const [video, setVideo] = useState<ComposerMedia | null>(request.media?.type === 'video' ? request.media : null);
  const [title, setTitle] = useState((request.title ?? '').slice(0, YOUTUBE_TITLE_LIMIT));
  const [description, setDescription] = useState(request.description ?? '');
  const descriptionHistory = useTextHistory(description, setDescription);
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState(tomorrowMorning);
  const [state, setState] = useState<'idle' | 'posting' | 'done'>('idle');
  const [doneAt, setDoneAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(!request.media);
  const [galleryVideos, setGalleryVideos] = useState<api.MediaAsset[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .checkYouTubeConnection()
      .then((check) => !cancelled && setConnection(check))
      .catch(() => !cancelled && setConnection({ connected: false, problem: 'Could not check your YouTube channel.' }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pickerOpen || galleryVideos) return;
    api
      .listMyGallery(undefined, 60)
      .then((items) => setGalleryVideos(items.filter((i) => i.type === 'video' || i.type === 'character')))
      .catch(() => setGalleryVideos([]));
  }, [pickerOpen, galleryVideos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'posting') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  const ready = !!connection?.connected && !!connection.working;
  const trimmedTitle = title.trim();
  const bytes = byteLength(description.trim());
  const overLimit = bytes > YOUTUBE_DESCRIPTION_BYTES;
  const titleHasAngles = /[<>]/.test(title + description);
  const canPost = state === 'idle' && ready && !!video && !!trimmedTitle && !overLimit;

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

  const writeWithAi = async () => {
    const draft = description.trim();
    const topic = draft || trimmedTitle || request.topic?.trim();
    if (!topic) {
      setError('Type a title or a few words about the video, then press Write with AI.');
      return;
    }
    setAiBusy(true);
    setError(null);
    try {
      const result = await api.generateText({
        prompt: draft
          ? `Improve this YouTube description and suggest a title. Keep its meaning and any facts exactly:\n\n${draft}`
          : `Write a YouTube title and description for a video about: ${topic}`,
        systemPrompt: AI_SYSTEM_PROMPT,
        temperature: 0.5,
      });
      const text = result.text.trim();
      const aiTitle = /TITLE:\s*(.+)/i.exec(text)?.[1]?.trim().replace(/^"|"$/g, '');
      const aiDescription = /DESCRIPTION:\s*([\s\S]+)/i.exec(text)?.[1]?.trim();
      if (aiTitle && !trimmedTitle) setTitle(aiTitle.replace(/[<>]/g, '').slice(0, YOUTUBE_TITLE_LIMIT));
      setDescription((aiDescription ?? text).replace(/[<>]/g, ''));
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach Lumora. Please try again.');
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async () => {
    if (!canPost || !video) return;
    const at = when === 'later' ? new Date(scheduledAt) : null;
    if (at && (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000)) {
      setError('Pick a time at least a minute from now, or upload now.');
      return;
    }
    setState('posting');
    setError(null);
    try {
      await createSocialPost({
        text: description.trim(),
        title: trimmedTitle,
        visibility,
        mediaAssetId: video.assetId,
        platforms: ['youtube'],
        scheduledAt: at ? at.toISOString() : undefined,
      });
      setDoneAt(at);
      setState('done');
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not upload. Please try again.');
      setState('idle');
    }
  };

  const preview = useMemo(
    () => (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="aspect-video bg-black flex items-center justify-center">
          {video ? (
            <video src={`${video.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-contain" />
          ) : (
            <Film className="w-8 h-8 text-slate-600" />
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className={`text-sm font-bold break-words ${trimmedTitle ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'}`}>
            {trimmedTitle || 'Your title appears here'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {connection?.channelTitle || 'Your channel'} · {VISIBILITY.find((v) => v.id === visibility)!.label}
          </p>
        </div>
      </div>
    ),
    [video, trimmedTitle, connection?.channelTitle, visibility],
  );

  const field =
    'w-full text-sm p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-red-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={() => state !== 'posting' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="youtube-uploader-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl min-h-full sm:min-h-0 bg-slate-50 dark:bg-slate-950 sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="youtube-uploader-title" className="text-base font-bold text-slate-900 dark:text-white">
            Upload to YouTube
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={state === 'posting'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {state === 'done' ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {doneAt ? `Scheduled for ${formatWhen(doneAt)} on YouTube.` : 'Uploading to YouTube now.'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {doneAt
                ? 'Lumora uploads it at that time. You can change or cancel it from the YouTube page until then.'
                : 'YouTube takes a few minutes to process a video. You get a notification when it is up.'}
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('youtube-posts');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                See my YouTube videos
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-5">
            <div className="space-y-4 min-w-0">
              {/* Channel */}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Channel</p>
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                    <Youtube className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {connection?.channelTitle || 'YouTube'}
                    </p>
                    <p
                      className={`text-[11px] truncate ${
                        connection && !ready ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {connection === undefined
                        ? 'Checking your channel...'
                        : ready
                          ? 'Connected'
                          : connection.connected
                            ? connection.problem ?? 'The connection needs renewing'
                            : 'Not connected yet'}
                    </p>
                  </div>
                  {ready ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Connected" />
                  ) : (
                    connection !== undefined && (
                      <button
                        type="button"
                        onClick={connect}
                        disabled={connecting}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold disabled:opacity-60"
                      >
                        {connecting && <Loader2 className="w-3 h-3 animate-spin" />}
                        {connection.connected ? 'Reconnect' : 'Connect YouTube'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Video */}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Video</p>
                {video && !pickerOpen ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                      <video src={`${video.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover" />
                    </div>
                    <p className="min-w-0 flex-1 text-xs text-slate-700 dark:text-slate-200 truncate">{video.name ?? 'Video'}</p>
                    <button type="button" onClick={() => setPickerOpen(true)} className="text-[11px] font-semibold text-red-600">
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-500">Pick a video from your Gallery</span>
                      {video && (
                        <button type="button" onClick={() => setPickerOpen(false)} className="text-slate-400" aria-label="Close Gallery">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {galleryVideos === null ? (
                      <div className="py-6 flex justify-center text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : galleryVideos.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-slate-500">
                        No videos in your Gallery yet. Make one in Video Studio first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
                        {galleryVideos.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setVideo({ assetId: item.id, type: 'video', url: item.url, name: item.fileName });
                              setPickerOpen(false);
                            }}
                            title={item.fileName}
                            className={`aspect-square rounded-lg overflow-hidden bg-black hover:ring-2 ring-red-600 ${
                              video?.assetId === item.id ? 'ring-2' : ''
                            }`}
                          >
                            <video src={`${item.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-1 text-[10px] text-slate-400">
                  A vertical video of up to 3 minutes appears as a Short. Videos made by Lumora&apos;s AI are labelled
                  &quot;altered or synthetic content&quot;, as YouTube asks.
                </p>
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="yt-title" className="text-xs font-bold text-slate-900 dark:text-white">
                    Title
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {title.length} / {YOUTUBE_TITLE_LIMIT}
                  </span>
                </div>
                <input
                  id="yt-title"
                  type="text"
                  value={title}
                  maxLength={YOUTUBE_TITLE_LIMIT}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Term insurance explained in 60 seconds"
                  className={field}
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="yt-description" className="text-xs font-bold text-slate-900 dark:text-white">
                    Description
                  </label>
                  <div className="flex items-center gap-1.5">
                    <VoiceInputButton
                      onText={(spoken) => setDescription((previous) => appendSpoken(previous, spoken))}
                      currentText={description}
                      onReplace={(spoken) => setDescription(spoken)}
                    />
                    <button
                      type="button"
                      onClick={writeWithAi}
                      disabled={aiBusy}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                    >
                      {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {description.trim() ? 'Improve with AI' : 'Write with AI'}
                    </button>
                  </div>
                </div>
                <textarea
                  id="yt-description"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={descriptionHistory.onKeyDown}
                  placeholder="What the video shows, a call to action, then hashtags such as #TermInsurance"
                  className={field}
                />
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-400">
                    {titleHasAngles
                      ? 'YouTube does not allow < and >; they are left out.'
                      : 'AI text is a draft: check facts, figures and any insurance claims.'}
                  </span>
                  <span className={overLimit ? 'text-red-600 font-bold' : 'text-slate-400'}>
                    {bytes.toLocaleString('en-IN')} / {YOUTUBE_DESCRIPTION_BYTES.toLocaleString('en-IN')} bytes
                  </span>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Who can watch</p>
                <div className="grid grid-cols-3 gap-2">
                  {VISIBILITY.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setVisibility(option.id)}
                      aria-pressed={visibility === option.id}
                      className={`p-2 rounded-xl border text-left ${
                        visibility === option.id
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">{option.label}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">{option.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Until Google approves Lumora&apos;s YouTube access (an audit), YouTube keeps uploaded videos private
                  whatever you choose here.
                </p>
              </div>

              {/* When */}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">When</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(['now', 'later'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setWhen(option)}
                      aria-pressed={when === option}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                        when === option
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {option === 'now' ? 'Upload now' : 'Schedule'}
                    </button>
                  ))}
                  {when === 'later' && (
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={toLocalInput(new Date(Date.now() + 2 * 60_000))}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      aria-label="Upload at"
                      className="text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-snug">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={!canPost}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {state === 'posting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : when === 'now' ? (
                  <Upload className="w-4 h-4" />
                ) : (
                  <CalendarClock className="w-4 h-4" />
                )}
                {when === 'now' ? 'Upload to YouTube' : 'Schedule upload'}
              </button>
              {!video && <p className="text-center text-[10px] text-slate-400 -mt-2">Pick a video to upload.</p>}
              {video && !trimmedTitle && <p className="text-center text-[10px] text-slate-400 -mt-2">Give it a title.</p>}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Preview</p>
              {preview}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Rendered once by App: shows the upload window whenever a screen calls openYouTubeUpload(). */
export const YouTubeUploaderHost: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const { request, key, close } = useYouTubeUploadRequest();
  return request ? <YouTubeUploader key={key} request={request} onClose={close} onNavigate={onNavigate} /> : null;
};
