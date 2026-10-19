import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Facebook,
  Globe,
  ImagePlus,
  Instagram,
  Linkedin,
  Loader2,
  Send,
  Sparkles,
  X,
  Youtube,
} from 'lucide-react';
import * as api from '../lib/api';
import { ViewType } from '../types';
import VoiceInputButton, { appendSpoken } from './VoiceInputButton';
import {
  COMPOSER_PLATFORMS,
  ComposerMedia,
  ComposerRequest,
  createSocialPost,
  PLATFORM_LABEL,
  PLATFORM_MEDIA_SUPPORT,
  PLATFORM_TEXT_LIMIT,
  PostMediaKind,
  usePostComposerRequest,
} from '../lib/socialPosts';

const PLATFORM_ICON: Record<api.SocialPlatform, React.FC<{ className?: string }>> = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const AI_SYSTEM_PROMPT =
  'You write LinkedIn posts for a small business or professional in India (often an insurance advisor). ' +
  'Write ONE post of 80-180 words: a strong first line, short paragraphs, a clear call to action, and 3 to 5 ' +
  'relevant hashtags on the last line. Plain text only - no markdown, at most two emojis. Do not invent facts, ' +
  'figures, returns, guarantees or claims; where a number is needed write a placeholder such as [premium]. ' +
  'Reply with only the post.';

/** A datetime-local value ("2026-10-20T09:00") for a Date, in this computer's time. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Tomorrow at 9:00, a sensible first suggestion for a scheduled post. */
function tomorrowMorning(): string {
  const date = new Date(Date.now() + DAY_MS);
  date.setHours(9, 0, 0, 0);
  return toLocalInput(date);
}

const formatWhen = (date: Date) =>
  date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Can this account take this post right now? Returns the reason it cannot, or null. */
function unavailableReason(
  platform: api.SocialPlatform,
  status: api.SocialConnectionStatus | undefined,
  kind: PostMediaKind,
): string | null {
  if (!status?.connected) return 'Not connected';
  if (status.expired) return 'Connection expired';
  if (!PLATFORM_MEDIA_SUPPORT[platform].includes(kind)) return kind === 'image' ? 'Video only for now' : 'Needs a video';
  return null;
}

interface PostComposerProps {
  request: ComposerRequest;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
}

/**
 * "Create post": write the text (Speak / Write with AI), attach a Gallery image or video, pick connected accounts,
 * then post now or schedule. Opened from the Calendar, the Gallery, the studios and the header's Create menu through
 * openPostComposer() (src/lib/socialPosts.ts). The server checks everything again (SocialPostsService).
 */
export const PostComposer: React.FC<PostComposerProps> = ({ request, onClose, onNavigate }) => {
  const [text, setText] = useState(request.text ?? '');
  const [media, setMedia] = useState<ComposerMedia | null>(request.media ?? null);
  const [connections, setConnections] = useState<Record<api.SocialPlatform, api.SocialConnectionStatus> | null>(null);
  const [selected, setSelected] = useState<api.SocialPlatform[]>([]);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState(tomorrowMorning);
  const [state, setState] = useState<'idle' | 'posting' | 'done'>('idle');
  const [doneAt, setDoneAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<api.MediaAsset[] | null>(null);

  const kind: PostMediaKind = media ? media.type : 'none';

  useEffect(() => {
    let cancelled = false;
    api
      .getSocialConnectionStatus()
      .then((status) => {
        if (cancelled) return;
        setConnections(status);
        // Start with LinkedIn when it can take this post.
        if (!unavailableReason('linkedin', status.linkedin, request.media?.type ?? 'none')) setSelected(['linkedin']);
      })
      .catch(() => {
        if (!cancelled) setError('Could not check your connected accounts. Close this and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [request.media?.type]);

  // Changing the media can rule an account out (e.g. Facebook takes only video).
  useEffect(() => {
    setSelected((previous) => previous.filter((p) => !unavailableReason(p, connections?.[p], kind)));
  }, [kind, connections]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'posting') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  const limit = selected.length ? Math.min(...selected.map((p) => PLATFORM_TEXT_LIMIT[p])) : PLATFORM_TEXT_LIMIT.linkedin;
  const trimmed = text.trim();
  const overLimit = trimmed.length > limit;
  const linkedInStatus = connections?.linkedin;
  const linkedInExpiresSoon =
    !!linkedInStatus?.connected &&
    !linkedInStatus.expired &&
    !!linkedInStatus.expiresAt &&
    new Date(linkedInStatus.expiresAt).getTime() - Date.now() < 7 * DAY_MS;
  const canPost = state === 'idle' && selected.length > 0 && (trimmed || media) && !overLimit;

  const togglePlatform = (platform: api.SocialPlatform) =>
    setSelected((previous) =>
      previous.includes(platform) ? previous.filter((p) => p !== platform) : [...previous, platform],
    );

  const writeWithAi = async () => {
    const topic = trimmed || request.topic?.trim();
    if (!topic) {
      setError('Type a few words about what you want to say, then press Write with AI.');
      return;
    }
    setAiBusy(true);
    setError(null);
    try {
      const result = await api.generateText({
        prompt: trimmed
          ? `Improve this LinkedIn post. Keep its meaning and any facts exactly as they are:\n\n${trimmed}`
          : `Write a LinkedIn post to go with ${kind === 'video' ? 'a video' : kind === 'image' ? 'an image' : 'nothing else'} about: ${topic}`,
        systemPrompt: AI_SYSTEM_PROMPT,
      });
      setText(result.text.trim());
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach Lumora. Please try again.');
    } finally {
      setAiBusy(false);
    }
  };

  const openPicker = () => {
    setPickerOpen(true);
    if (galleryItems) return;
    api
      .listMyGallery(undefined, 60)
      .then((items) => setGalleryItems(items.filter((i) => i.type === 'image' || i.type === 'video' || i.type === 'character')))
      .catch(() => setGalleryItems([]));
  };

  const pick = (item: api.MediaAsset) => {
    setMedia({ assetId: item.id, type: item.type === 'image' ? 'image' : 'video', url: item.url, name: item.fileName });
    setPickerOpen(false);
  };

  const submit = async () => {
    if (!canPost) return;
    const at = when === 'later' ? new Date(scheduledAt) : null;
    if (at && (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000)) {
      setError('Pick a time at least a minute from now, or post now.');
      return;
    }
    setState('posting');
    setError(null);
    try {
      await createSocialPost({
        text: trimmed,
        mediaAssetId: media?.assetId,
        platforms: selected,
        scheduledAt: at ? at.toISOString() : undefined,
      });
      setDoneAt(at);
      setState('done');
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not post. Please try again.');
      setState('idle');
    }
  };

  const accountNames = selected.map((p) => PLATFORM_LABEL[p]).join(' and ');
  const previewName = linkedInStatus?.label || 'Your name';

  const preview = useMemo(
    () => (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-2.5 p-3">
          <div className="w-9 h-9 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-sm font-bold">
            {previewName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{previewName}</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              {when === 'now' ? 'Now' : formatWhen(new Date(scheduledAt))} · <Globe className="w-2.5 h-2.5" />
            </p>
          </div>
        </div>
        {trimmed ? (
          <p className="px-3 pb-3 text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words line-clamp-[8]">
            {trimmed}
          </p>
        ) : (
          <p className="px-3 pb-3 text-xs text-slate-400 italic">Your text appears here.</p>
        )}
        {media &&
          (media.type === 'image' ? (
            <img src={media.url} alt="" className="w-full max-h-72 object-cover bg-slate-100 dark:bg-slate-800" />
          ) : (
            <video src={`${media.url}#t=0.1`} muted preload="metadata" className="w-full max-h-72 bg-black" />
          ))}
      </div>
    ),
    [previewName, when, scheduledAt, trimmed, media],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={() => state !== 'posting' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-composer-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl min-h-full sm:min-h-0 bg-slate-50 dark:bg-slate-950 sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="post-composer-title" className="text-base font-bold text-slate-900 dark:text-white">
            Create post
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
              {doneAt ? `Scheduled for ${formatWhen(doneAt)} on ${accountNames}.` : `Posting to ${accountNames} now.`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {doneAt
                ? 'Lumora posts it at that time. You can change or cancel it in the Calendar until then.'
                : 'It appears on your profile in a minute or two. You get a notification when it is live.'}
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('calendar');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Open Calendar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-5">
            <div className="space-y-4 min-w-0">
              {/* Accounts */}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Post to</p>
                <div className="grid grid-cols-2 gap-2">
                  {COMPOSER_PLATFORMS.map((platform) => {
                    const Icon = PLATFORM_ICON[platform];
                    const status = connections?.[platform];
                    const reason = connections ? unavailableReason(platform, status, kind) : '...';
                    const isOn = selected.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        disabled={!!reason}
                        onClick={() => togglePlatform(platform)}
                        aria-pressed={isOn}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          isOn
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isOn ? 'text-blue-600' : 'text-slate-500'}`} />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white">
                            {PLATFORM_LABEL[platform]}
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {reason ?? status?.label ?? 'Connected'}
                          </span>
                        </span>
                        {isOn && <Check className="w-3.5 h-3.5 ml-auto text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {connections && (!linkedInStatus?.connected || linkedInStatus.expired || linkedInExpiresSoon) && (
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                    {!linkedInStatus?.connected
                      ? 'LinkedIn is not connected yet.'
                      : linkedInStatus.expired
                        ? 'Your LinkedIn connection has run out.'
                        : `Your LinkedIn connection runs out on ${new Date(linkedInStatus.expiresAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigate('integrations');
                      }}
                      className="font-bold underline"
                    >
                      {linkedInStatus?.connected ? 'Reconnect it in Integrations' : 'Connect it in Integrations'}
                    </button>
                  </p>
                )}
              </div>

              {/* Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="post-text" className="text-xs font-bold text-slate-900 dark:text-white">
                    What do you want to say?
                  </label>
                  <div className="flex items-center gap-1.5">
                    <VoiceInputButton onText={(spoken) => setText((previous) => appendSpoken(previous, spoken))} />
                    <button
                      type="button"
                      onClick={writeWithAi}
                      disabled={aiBusy}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
                    >
                      {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {trimmed ? 'Improve with AI' : 'Write with AI'}
                    </button>
                  </div>
                </div>
                <textarea
                  id="post-text"
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    request.topic
                      ? 'Write your post, or press Write with AI to draft one from what you made.'
                      : 'Share a tip, an offer or some news. Put hashtags at the end, e.g. #TermInsurance'
                  }
                  className="w-full text-sm p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-400">AI text is a draft: check facts, figures and any insurance claims.</span>
                  <span className={overLimit ? 'text-red-600 font-bold' : 'text-slate-400'}>
                    {trimmed.length.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Media */}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Image or video</p>
                {media ? (
                  <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                      {media.type === 'image' ? (
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={`${media.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="min-w-0 flex-1 text-xs text-slate-700 dark:text-slate-200 truncate">
                      {media.name ?? (media.type === 'image' ? 'Image' : 'Video')}
                    </p>
                    <button type="button" onClick={openPicker} className="text-[11px] font-semibold text-blue-600">
                      Change
                    </button>
                    <button type="button" onClick={() => setMedia(null)} className="text-[11px] font-semibold text-slate-500 hover:text-red-600">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openPicker}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-blue-400"
                  >
                    <ImagePlus className="w-4 h-4" /> Add from your Gallery (optional)
                  </button>
                )}
                {pickerOpen && (
                  <div className="mt-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-500">Your Gallery</span>
                      <button type="button" onClick={() => setPickerOpen(false)} className="text-slate-400" aria-label="Close Gallery">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {galleryItems === null ? (
                      <div className="py-6 flex justify-center text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : galleryItems.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-slate-500">No images or videos yet.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
                        {galleryItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => pick(item)}
                            title={item.fileName}
                            className="aspect-square rounded-lg overflow-hidden bg-slate-900 ring-blue-600 hover:ring-2"
                          >
                            {item.type === 'image' ? (
                              <img src={item.url} alt={item.fileName} className="w-full h-full object-cover" />
                            ) : (
                              <video src={`${item.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {option === 'now' ? 'Post now' : 'Schedule'}
                    </button>
                  ))}
                  {when === 'later' && (
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={toLocalInput(new Date(Date.now() + 2 * 60_000))}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      aria-label="Post at"
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
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {state === 'posting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : when === 'now' ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <CalendarClock className="w-4 h-4" />
                )}
                {when === 'now' ? 'Post now' : 'Schedule post'}
                {selected.length > 0 && ` to ${accountNames}`}
              </button>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Preview</p>
              {preview}
              <p className="text-[10px] text-slate-400">
                Roughly how it looks on LinkedIn. LinkedIn shows the first few lines and a "...more" link.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Rendered once by App: shows the composer whenever a screen calls openPostComposer(). */
export const PostComposerHost: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const { request, key, close } = usePostComposerRequest();
  return request ? <PostComposer key={key} request={request} onClose={close} onNavigate={onNavigate} /> : null;
};
