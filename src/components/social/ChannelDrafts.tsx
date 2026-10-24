import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Mic } from 'lucide-react';
import * as api from '../../lib/api';
import { cleanPrompt, studioForType } from '../../lib/reuse';
import { openPostComposer, openYouTubeUpload, PLATFORM_MEDIA_SUPPORT } from '../../lib/socialPosts';
import { ViewType } from '../../types';
import { CalendarPost } from '../views/ContentCalendarView';

type Channel = 'linkedin' | 'facebook' | 'youtube';

const ACTION_LABEL: Record<Channel, string> = {
  linkedin: 'Write post',
  facebook: 'Write post',
  youtube: 'Upload',
};

/**
 * Drafts for one channel: things you made in the studios that this channel can post and that have not gone out on it yet
 * (nothing posted or scheduled there carries the same Gallery item). This is where "pick up where you left off" lives now.
 */
export const ChannelDrafts: React.FC<{
  channel: Channel;
  /** The channel's posts (usePlatformPosts); null while they load. */
  posts: CalendarPost[] | null;
  onNavigate: (view: ViewType) => void;
}> = ({ channel, posts, onNavigate }) => {
  const [items, setItems] = useState<api.LibraryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listLibrary({ scope: 'mine', generatedOnly: true, limit: 24 })
      .then((page) => !cancelled && setItems(page.items))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const drafts = useMemo(() => {
    if (items === null || posts === null) return null;
    const kinds = PLATFORM_MEDIA_SUPPORT[channel];
    const used = new Set(posts.map((p) => p.content?.metadata?.mediaAssetId).filter(Boolean));
    return items
      .filter((item) => {
        const kind = item.type === 'image' ? 'image' : item.type === 'video' || item.type === 'character' ? 'video' : null;
        return kind !== null && kinds.includes(kind) && !used.has(item.id);
      })
      .slice(0, 6);
  }, [items, posts, channel]);

  const open = (item: api.LibraryItem) => {
    const media = {
      assetId: item.id,
      type: item.type === 'image' ? ('image' as const) : ('video' as const),
      url: item.url,
      name: item.fileName,
    };
    const studio = studioForType(item.type);
    const text = item.prompt ? cleanPrompt(studio ?? 'image', item.prompt) : undefined;
    if (channel === 'linkedin') openPostComposer({ media, topic: text });
    else if (channel === 'youtube') openYouTubeUpload({ media, title: text?.slice(0, 100), topic: text });
    else openPostComposer({ platform: 'facebook', media, topic: text });
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Drafts</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Made in your studios and not posted here yet. Pick one up and finish it.
        </p>
      </div>
      {drafts === null ? (
        <div className="flex justify-center py-6 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <p className="text-[11px] text-slate-400 py-4 text-center">
          No drafts. {channel === 'linkedin' ? 'Images and videos' : 'Videos'} you make will wait here until you post them.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {drafts.map((item) => (
            <li
              key={item.id}
              className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 flex flex-col"
            >
              <div className="aspect-video bg-slate-950 flex items-center justify-center">
                {item.type === 'image' ? (
                  <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : item.type === 'audio' ? (
                  <Mic className="w-5 h-5 text-slate-500" />
                ) : (
                  <video src={item.url} muted preload="metadata" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2 space-y-1.5 flex-1 flex flex-col">
                <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                  {item.prompt ? cleanPrompt(studioForType(item.type) ?? 'image', item.prompt) : item.fileName}
                </p>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="mt-auto py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  {ACTION_LABEL[channel]}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
