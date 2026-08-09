import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pause, Play, Search } from 'lucide-react';
import { SARVAM_VOICE_CATALOG, SarvamVoiceGender } from '../lib/sarvamVoices';

interface SarvamVoiceSelectProps {
  /** '' means "Auto" (no specific voice picked). */
  value: string;
  onChange: (voiceId: string) => void;
  previewingVoiceId: string | null;
  onPreview: (voiceId: string) => void;
  autoLabel?: string;
  /** When set, hides the opposite confirmed-gender group (e.g. "male" hides
   * "Female (confirmed)") so the list narrows to match the Gender toggle.
   * "More voices" (gender not documented) always stays visible either way -
   * those voices aren't known to NOT match, so hiding them would just lose
   * access to 37 of the 44 voices for no real reason. */
  genderFilter?: SarvamVoiceGender;
}

const GROUPS: {
  label: string;
  gender: SarvamVoiceGender | undefined;
  filter: (gender: SarvamVoiceGender | undefined) => boolean;
}[] = [
  { label: 'Female (confirmed)', gender: 'female', filter: (g) => g === 'female' },
  { label: 'Male (confirmed)', gender: 'male', filter: (g) => g === 'male' },
  { label: 'More voices (gender not documented by Sarvam)', gender: undefined, filter: (g) => !g },
];

/**
 * Searchable, grouped voice picker with an inline preview button per row -
 * a native <select> can't support either (no search, no nested buttons in
 * options), so this is a small from-scratch combobox rather than a heavier
 * dependency like react-select. Preview plays a local sample (see
 * scripts/generate-sarvam-voice-samples.mjs) - callers own the actual
 * <audio> playback via onPreview, this component is just the picker UI.
 */
export const SarvamVoiceSelect: React.FC<SarvamVoiceSelectProps> = ({
  value,
  onChange,
  previewingVoiceId,
  onPreview,
  autoLabel = 'Auto (use Gender above)',
  genderFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selected = SARVAM_VOICE_CATALOG.find((v) => v.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? SARVAM_VOICE_CATALOG.filter((v) => v.name.toLowerCase().includes(normalizedQuery))
    : SARVAM_VOICE_CATALOG;

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
      >
        <span className={`truncate ${selected ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
          {selected ? selected.name : autoLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-72 flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- opening the dropdown is itself the user's intent to search */}
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search voices..."
                className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto">
            {!normalizedQuery && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  value === ''
                    ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 font-semibold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {value === '' ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{autoLabel}</span>
              </button>
            )}

            {GROUPS.filter(
              (group) => !genderFilter || !group.gender || group.gender === genderFilter,
            ).map((group) => {
              const groupVoices = filtered.filter((v) => group.filter(v.gender));
              if (groupVoices.length === 0) return null;
              return (
                <div key={group.label}>
                  <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </div>
                  {groupVoices.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleSelect(v.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        value === v.id
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 font-semibold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {value === v.id ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="flex-1 truncate">{v.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(v.id);
                        }}
                        title="Preview (local sample, no API call)"
                        className="shrink-0 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        {previewingVoiceId === v.id ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[11px] text-slate-400">No voices match "{query}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
