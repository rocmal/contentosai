import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, Mic, UserRound, Video } from 'lucide-react';
import * as api from '../lib/api';
import { StudioTab as StudioTabKey } from './types';

interface StudioTabProps {
  activeSubTab: StudioTabKey;
  onSelectSubTab: (tab: StudioTabKey) => void;
  onOpenCreate: () => void;
}

const SUB_TABS: { key: StudioTabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'video', label: 'Video', icon: Video },
  { key: 'image', label: 'Image', icon: ImageIcon },
  { key: 'voice', label: 'Voice', icon: Mic },
  { key: 'character', label: 'Character', icon: UserRound },
];

function galleryTitles(items: api.MediaAsset[]): string {
  return items.map((a) => a.prompt?.trim() || a.fileName).join(', ');
}

export const StudioTab: React.FC<StudioTabProps> = ({ activeSubTab, onSelectSubTab, onOpenCreate }) => {
  // Fetched once on mount rather than per-sub-tab, so switching between
  // Video/Image/Voice/Character never shows a loading flicker - four small
  // requests is cheap next to that.
  const [recentVideos, setRecentVideos] = useState<api.MediaAsset[]>([]);
  const [recentImages, setRecentImages] = useState<api.MediaAsset[]>([]);
  const [recentVoice, setRecentVoice] = useState<api.MediaAsset[]>([]);
  const [avatarsTotal, setAvatarsTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.listMyGallery('video', 2),
      api.listMyGallery('image', 2),
      api.listMyGallery('audio', 1),
      api.listAvatars({ limit: 1 }),
    ])
      .then(([videos, images, voice, avatars]) => {
        if (cancelled) return;
        setRecentVideos(videos);
        setRecentImages(images);
        setRecentVoice(voice);
        setAvatarsTotal(avatars.meta.totalItems);
      })
      .catch(() => {
        // Each sub-panel below just falls back to its own empty-state copy.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-5 pt-3.5 pb-6">
      <h1 className="font-display text-[21px] text-slate-900 mb-4">Studio</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {SUB_TABS.map((t) => {
          const active = activeSubTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onSelectSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                active ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'video' && (
        <>
          {/* No video-project entity exists in apps/api yet, so there's
              still no editable, resumable "Continue editing" project or a
              real past-projects list with step progress - that's an honest
              hand-off to desktop below, not a data gap in the Recent line.
              The Recent line itself IS real (video generations now save to
              the gallery), though a character-generated clip can appear
              here too - MediaAssetType has no separate 'character' value,
              so Character Studio's talking-avatar output is saved as
              'video' as well (see mediaDisplay.ts). */}
          <div className="bg-slate-100 rounded-[20px] p-[18px] mb-[18px]">
            <h3 className="text-sm text-slate-900 mb-1.5">Video Studio</h3>
            {loading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin mb-3" />
            ) : (
              <p className="text-[12.5px] text-slate-600 mb-3">
                {recentVideos.length > 0 ? `Recent: ${galleryTitles(recentVideos)}` : 'No videos generated yet.'}
              </p>
            )}
            <p className="text-[11px] text-slate-500 m-0">Project history and step-by-step editing open on desktop.</p>
          </div>
          <button
            onClick={onOpenCreate}
            className="h-[46px] text-[13px] w-full rounded-full bg-blue-600 text-white font-bold"
          >
            New video
          </button>
        </>
      )}

      {activeSubTab === 'image' && (
        <div className="bg-slate-100 rounded-[20px] p-[18px]">
          <h3 className="text-sm text-slate-900 mb-1.5">Image Studio</h3>
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin mb-3" />
          ) : (
            <p className="text-[12.5px] text-slate-600 mb-3">
              {recentImages.length > 0 ? `Recent: ${galleryTitles(recentImages)}` : 'No images generated yet.'}
            </p>
          )}
          <p className="text-[11px] text-slate-500 m-0">Full editor and upscaling tools open on desktop.</p>
        </div>
      )}
      {activeSubTab === 'voice' && (
        <div className="bg-slate-100 rounded-[20px] p-[18px]">
          <h3 className="text-sm text-slate-900 mb-1.5">Voice Studio</h3>
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin mb-3" />
          ) : (
            <p className="text-[12.5px] text-slate-600 mb-3">
              {recentVoice.length > 0 ? `Recent: ${galleryTitles(recentVoice)}` : 'No voiceovers generated yet.'}
            </p>
          )}
          <p className="text-[11px] text-slate-500 m-0">Cloning and voice-library tools open on desktop.</p>
        </div>
      )}
      {activeSubTab === 'character' && (
        <div className="bg-slate-100 rounded-[20px] p-[18px]">
          <h3 className="text-sm text-slate-900 mb-1.5">Character Studio</h3>
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin mb-3" />
          ) : (
            <p className="text-[12.5px] text-slate-600 mb-3">
              {avatarsTotal !== null && avatarsTotal > 0
                ? `${avatarsTotal} avatar${avatarsTotal === 1 ? '' : 's'} ready to animate`
                : 'No avatars set up yet.'}
            </p>
          )}
          <p className="text-[11px] text-slate-500 m-0">Upload a photo and script on desktop to set up a new avatar.</p>
        </div>
      )}
    </div>
  );
};
