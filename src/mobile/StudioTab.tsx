import React from 'react';
import { Check, Image as ImageIcon, Mic, Play, UserRound, Video } from 'lucide-react';
import { StudioTab as StudioTabKey } from './types';
import { CONTINUE_PROJECT, CURRENT_STEP_INDEX, PAST_VIDEO_PROJECTS, STEP_NAMES } from './mockMobileData';
import { studioStatusClasses } from './postDisplay';

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

export const StudioTab: React.FC<StudioTabProps> = ({ activeSubTab, onSelectSubTab, onOpenCreate }) => {
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
          <div className="bg-slate-100 rounded-[20px] p-4 mb-[18px]">
            <div className="flex gap-3 mb-3">
              <div className="w-20 h-20 rounded-2xl bg-[repeating-linear-gradient(135deg,#cbd5e1,#cbd5e1_8px,#94a3b8_8px,#94a3b8_16px)] flex-none flex items-center justify-center">
                <Play className="w-[18px] h-[18px] text-white fill-white" />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Continue editing</span>
                <span className="text-[13.5px] font-bold text-slate-900">{CONTINUE_PROJECT.title}</span>
                <span className="text-[11px] text-slate-500">
                  {CONTINUE_PROJECT.duration} · {CONTINUE_PROJECT.stepLabel}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {STEP_NAMES.map((name, i) => {
                const state = i < CURRENT_STEP_INDEX ? 'done' : i === CURRENT_STEP_INDEX ? 'current' : 'todo';
                const cls =
                  state === 'done'
                    ? 'bg-emerald-50 text-emerald-600'
                    : state === 'current'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-500';
                return (
                  <span key={name} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${cls}`}>
                    {state === 'done' && <Check className="w-2.5 h-2.5" />}
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={onOpenCreate}
            className="h-[46px] text-[13px] mb-[18px] w-full rounded-full bg-blue-600 text-white font-bold"
          >
            New video
          </button>
          <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2.5">Past projects</div>
          <div className="flex flex-col gap-2">
            {PAST_VIDEO_PROJECTS.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100">
                <div>
                  <div className="text-[12.5px] font-bold text-slate-900">{p.title}</div>
                  <div className="text-[11px] text-slate-500">{p.duration}</div>
                </div>
                <span className={studioStatusClasses(p.status)}>{p.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeSubTab === 'image' && (
        <div className="bg-slate-100 rounded-[20px] p-[18px]">
          <h3 className="text-sm text-slate-900 mb-1.5">Image Studio</h3>
          <p className="text-[12.5px] text-slate-600 mb-3">Recent: Pumpkin Latte Flat Lay, Autumn Table Setting</p>
          <p className="text-[11px] text-slate-500 m-0">Full editor and upscaling tools open on desktop.</p>
        </div>
      )}
      {activeSubTab === 'voice' && (
        <div className="bg-slate-100 rounded-[20px] p-[18px]">
          <h3 className="text-sm text-slate-900 mb-1.5">Voice Studio</h3>
          <p className="text-[12.5px] text-slate-600 mb-3">Voices: Warm Female (EN-US), Friendly Male (EN-US)</p>
          <p className="text-[11px] text-slate-500 m-0">Recent: Fall Menu VO. Cloning tools open on desktop.</p>
        </div>
      )}
      {activeSubTab === 'character' && (
        <div className="bg-slate-100 rounded-[20px] p-[18px]">
          <h3 className="text-sm text-slate-900 mb-1.5">Character Studio</h3>
          <p className="text-[12.5px] text-slate-600 mb-3">2 talking-avatar videos generated</p>
          <p className="text-[11px] text-slate-500 m-0">Upload a photo and script on desktop to set up a new avatar.</p>
        </div>
      )}
    </div>
  );
};
