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

function sceneCountLabel(project: api.VideoProject): string {
  const n = project.scenes.length;
  return `${n} scene${n === 1 ? '' : 's'}`;
}

export const StudioTab: React.FC<StudioTabProps> = ({ activeSubTab, onSelectSubTab, onOpenCreate }) => {
  // Fetched once on mount rather than per-sub-tab, so switching between
  // Video/Image/Voice/Character never shows a loading flicker.
  const [videoProjects, setVideoProjects] = useState<api.VideoProject[]>([]);
  const [recentImages, setRecentImages] = useState<api.MediaAsset[]>([]);
  const [recentVoice, setRecentVoice] = useState<api.MediaAsset[]>([]);
  const [recentCharacters, setRecentCharacters] = useState<api.MediaAsset[]>([]);
  const [avatarsTotal, setAvatarsTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.listMyVideoProjects(6),
      api.listMyGallery('image', 2),
      api.listMyGallery('audio', 1),
      api.listMyGallery('character', 2),
      api.listAvatars({ limit: 1 }),
    ])
      .then(([projects, images, voice, characters, avatars]) => {
        if (cancelled) return;
        setVideoProjects(projects);
        setRecentImages(images);
        setRecentVoice(voice);
        setRecentCharacters(characters);
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

  // videoProjects is sorted most-recently-edited first (see the backend's
  // findMine) - the top one is "Continue editing" only if it's still a
  // draft; a finished project just goes straight into the past list below.
  const continueEditing = videoProjects[0]?.status === 'draft' ? videoProjects[0] : null;
  const pastProjects = continueEditing ? videoProjects.slice(1) : videoProjects;

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
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin mb-3" />}

          {!loading && continueEditing && (
            <div className="bg-blue-950 rounded-[20px] p-[18px] mb-3 relative overflow-hidden">
              <div className="absolute -top-[24px] -right-[24px] w-[90px] h-[90px] rounded-full bg-white/[0.08]" />
              <span className="relative inline-block text-[10.5px] font-bold tracking-wide uppercase text-blue-300 mb-1.5">
                Continue editing
              </span>
              <h3 className="relative text-[15px] font-bold text-white leading-tight mb-1">{continueEditing.title}</h3>
              <p className="relative text-[11.5px] text-blue-200 m-0">{sceneCountLabel(continueEditing)} · draft</p>
            </div>
          )}

          {!loading && (
            <div className="bg-slate-100 rounded-[20px] p-[18px] mb-[18px]">
              <h3 className="text-sm text-slate-900 mb-1.5">Video Studio</h3>
              {pastProjects.length > 0 ? (
                <div className="flex flex-col gap-1.5 mb-3">
                  {pastProjects.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-700 truncate mr-2">{p.title}</span>
                      <span className="text-slate-400 flex-none">
                        {p.status === 'ready' ? 'Ready' : `${sceneCountLabel(p)} · draft`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-slate-600 mb-3">
                  {continueEditing ? 'No other projects yet.' : 'No videos generated yet.'}
                </p>
              )}
              <p className="text-[11px] text-slate-500 m-0">Project history and step-by-step editing open on desktop.</p>
            </div>
          )}

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
            <>
              <p className="text-[12.5px] text-slate-600 mb-1.5">
                {avatarsTotal !== null && avatarsTotal > 0
                  ? `${avatarsTotal} avatar${avatarsTotal === 1 ? '' : 's'} ready to animate`
                  : 'No avatars set up yet.'}
              </p>
              <p className="text-[12.5px] text-slate-600 mb-3">
                {recentCharacters.length > 0
                  ? `Recent: ${galleryTitles(recentCharacters)}`
                  : 'No talking-avatar videos generated yet.'}
              </p>
            </>
          )}
          <p className="text-[11px] text-slate-500 m-0">Upload a photo and script on desktop to set up a new avatar.</p>
        </div>
      )}
    </div>
  );
};
