import React, { useState } from 'react';
import {
  AlertCircle,
  Brain,
  Check,
  Loader2,
  Plus,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { BrandBrain } from '../../types';
import { saveBrandProfile } from '../../lib/api';

interface BrandBrainViewProps {
  brandBrain: BrandBrain;
  onUpdateBrandBrain: (newBrain: BrandBrain) => void;
}

function ChipList({
  values,
  onAdd,
  onRemove,
  addLabel,
}: {
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v, idx) => (
        <span
          key={`${v}-${idx}`}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-semibold"
        >
          {v}
          <button onClick={() => onRemove(idx)} className="hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={() => {
          const v = prompt(addLabel);
          if (v?.trim()) onAdd(v.trim());
        }}
        className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 text-xs font-semibold"
      >
        +
      </button>
    </div>
  );
}

export const BrandBrainView: React.FC<BrandBrainViewProps> = ({
  brandBrain,
  onUpdateBrandBrain,
}) => {
  const [formState, setFormState] = useState<BrandBrain>(brandBrain);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BrandBrain>(key: K, value: BrandBrain[K]) =>
    setFormState((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const persisted = await saveBrandProfile(formState);
      setFormState(persisted);
      onUpdateBrandBrain(persisted);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Brand Brain');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Brand Brain..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <span className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Brand Brain
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The central source of truth for your brand's AI persona, voice, and visual identity.
        </p>
      </div>

      {/* 2x2 Cards Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD 1: Brand Identity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>Brand Identity</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Business Name
            </label>
            <input
              type="text"
              value={formState.businessName}
              onChange={(e) => set('businessName', e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Mission Statement
            </label>
            <textarea
              rows={3}
              value={formState.mission}
              onChange={(e) => set('mission', e.target.value)}
              placeholder="What is the core purpose of your brand?"
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Vision & Values
            </label>
            <textarea
              rows={3}
              value={formState.vision}
              onChange={(e) => set('vision', e.target.value)}
              placeholder="Where is your brand heading, and what values guide the journey?"
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* CARD 2: Assets */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <UploadCloud className="w-4 h-4" />
            <span>Assets</span>
          </div>

          {/* Logo URL */}
          <div
            onClick={() => {
              const url = prompt('Logo image URL:', formState.logoUrl);
              if (url != null) set('logoUrl', url.trim());
            }}
            className="p-5 rounded-2xl border-2 border-dashed border-blue-200 dark:border-slate-800 hover:border-blue-500/60 bg-blue-50/30 dark:bg-slate-800/40 text-center cursor-pointer transition-colors space-y-1.5"
          >
            {formState.logoUrl ? (
              <img src={formState.logoUrl} alt="Brand logo" className="w-10 h-10 rounded-lg object-cover mx-auto" />
            ) : (
              <UploadCloud className="w-6 h-6 text-blue-500 mx-auto" />
            )}
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {formState.logoUrl ? 'Change Logo URL' : 'Set Primary Logo URL'}
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-[220px] mx-auto">
              {formState.logoUrl || 'Click to paste an image URL'}
            </p>
          </div>

          {/* Primary Colors Swatches */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Primary Colors
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {formState.brandColors.map((hex, idx) => (
                <div key={`${hex}-${idx}`} className="text-center space-y-1 group relative">
                  <button
                    onClick={() => set('brandColors', formState.brandColors.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] hidden group-hover:flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <div className="w-10 h-10 rounded-lg shadow-xs" style={{ backgroundColor: hex }} />
                  <span className="text-[9px] font-mono text-slate-400">{hex}</span>
                </div>
              ))}
              <button
                onClick={() => {
                  const hex = prompt('Hex color (e.g. #2563EB):');
                  if (hex?.trim()) set('brandColors', [...formState.brandColors, hex.trim()]);
                }}
                className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Font Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Primary Font
            </label>
            <select
              value={formState.primaryFont}
              onChange={(e) => set('primaryFont', e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="Inter">Inter</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="Playfair Display">Playfair Display</option>
            </select>
          </div>
        </div>

        {/* CARD 3: Brand Tone & Voice */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>Brand Tone & Voice</span>
          </div>

          {/* Voice Personality / Tone of Voice Chips */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              TONE OF VOICE
            </label>
            <ChipList
              values={formState.toneOfVoice}
              onAdd={(v) => set('toneOfVoice', [...formState.toneOfVoice, v])}
              onRemove={(idx) => set('toneOfVoice', formState.toneOfVoice.filter((_, i) => i !== idx))}
              addLabel="Enter a tone adjective (e.g. Authoritative):"
            />
          </div>

          {/* Sample Writing Style / Guidelines */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Sample Writing Style / Guidelines
            </label>
            <textarea
              rows={3}
              value={formState.guidelines ?? ''}
              onChange={(e) => set('guidelines', e.target.value)}
              placeholder="Paste a few sentences that perfectly represent your brand's voice..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Primary CTA
            </label>
            <input
              type="text"
              value={formState.primaryCTA}
              onChange={(e) => set('primaryCTA', e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* CARD 4: Market Strategy */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>Market Strategy</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Target Audience
            </label>
            <textarea
              rows={2}
              value={formState.targetAudience}
              onChange={(e) => set('targetAudience', e.target.value)}
              placeholder="Who is this brand for?"
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Keywords
            </label>
            <div className="p-3 rounded-2xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800">
              <ChipList
                values={formState.keywords}
                onAdd={(v) => set('keywords', [...formState.keywords, v])}
                onRemove={(idx) => set('keywords', formState.keywords.filter((_, i) => i !== idx))}
                addLabel="Add keyword..."
              />
            </div>
          </div>

          {/* Key Competitors */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Key Competitors
            </label>
            <ChipList
              values={formState.competitors}
              onAdd={(v) => set('competitors', [...formState.competitors, v])}
              onRemove={(idx) => set('competitors', formState.competitors.filter((_, i) => i !== idx))}
              addLabel="Add competitor name..."
            />
          </div>
        </div>

      </div>
    </div>
  );
};
