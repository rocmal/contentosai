import React, { useState } from 'react';
import {
  Bell,
  Brain,
  Check,
  HelpCircle,
  Plus,
  Save,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { BrandBrain } from '../../types';

interface BrandBrainViewProps {
  brandBrain: BrandBrain;
  onUpdateBrandBrain: (newBrain: BrandBrain) => void;
}

export const BrandBrainView: React.FC<BrandBrainViewProps> = ({
  brandBrain,
  onUpdateBrandBrain,
}) => {
  const [formState, setFormState] = useState<BrandBrain>(brandBrain);
  const [saved, setSaved] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'Professional' | 'Creative'>('Professional');
  const [voicePersonalities, setVoicePersonalities] = useState([
    'Authoritative',
    'Minimalist',
    'Direct',
    'Empathetic',
  ]);
  const [interests, setInterests] = useState([
    'Tech Innovation',
    'Minimalist Design',
    'Productivity Tools',
  ]);
  const [newInterest, setNewInterest] = useState('');

  const handleSave = () => {
    onUpdateBrandBrain(formState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeInterest = (idx: number) => {
    setInterests(interests.filter((_, i) => i !== idx));
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Bar for Brand Brain View matching screenshot */}
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
          <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? 'Saved!' : 'Save Changes'}</span>
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
              Mission Statement
            </label>
            <textarea
              rows={3}
              value={formState.mission}
              onChange={(e) => setFormState({ ...formState, mission: e.target.value })}
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

          {/* Logo Upload Drop Area */}
          <div
            onClick={() => alert('Logo Upload Dialog Opened')}
            className="p-5 rounded-2xl border-2 border-dashed border-blue-200 dark:border-slate-800 hover:border-blue-500/60 bg-blue-50/30 dark:bg-slate-800/40 text-center cursor-pointer transition-colors space-y-1.5"
          >
            <UploadCloud className="w-6 h-6 text-blue-500 mx-auto" />
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Upload Primary Logo
            </p>
            <p className="text-[10px] text-slate-400">SVG, PNG, or AI (Max 5MB)</p>
          </div>

          {/* Primary Colors Swatches */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Primary Colors
            </label>
            <div className="flex items-center gap-3">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-lg bg-[#0050CB] shadow-xs" />
                <span className="text-[9px] font-mono text-slate-400">#0050CB</span>
              </div>
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-lg bg-[#505F76] shadow-xs" />
                <span className="text-[9px] font-mono text-slate-400">#505F76</span>
              </div>
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-lg bg-[#DAE2FD] shadow-xs" />
                <span className="text-[9px] font-mono text-slate-400">#DAE2FD</span>
              </div>
              <button
                onClick={() => alert('Color picker opened!')}
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
            <select className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer">
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

          {/* Primary Tone Radio Options */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              PRIMARY TONE
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer bg-blue-50/50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-blue-200 dark:border-slate-700">
                <input
                  type="radio"
                  name="tone"
                  checked={selectedTone === 'Professional'}
                  onChange={() => setSelectedTone('Professional')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Professional
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="radio"
                  name="tone"
                  checked={selectedTone === 'Creative'}
                  onChange={() => setSelectedTone('Creative')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Creative
              </label>
            </div>
          </div>

          {/* Voice Personality Chips */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              VOICE PERSONALITY
            </label>
            <div className="flex flex-wrap gap-1.5">
              {voicePersonalities.map((vp) => (
                <span
                  key={vp}
                  className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-semibold"
                >
                  {vp}
                </span>
              ))}
              <button
                onClick={() => {
                  const p = prompt('Enter voice personality:');
                  if (p) setVoicePersonalities([...voicePersonalities, p]);
                }}
                className="px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-500 text-xs font-semibold"
              >
                +
              </button>
            </div>
          </div>

          {/* Sample Writing Style Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Sample Writing Style
            </label>
            <textarea
              rows={3}
              placeholder="Paste a few sentences that perfectly represent your brand's voice..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* CARD 4: Market Strategy */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>Market Strategy</span>
          </div>

          {/* Target Audience Interests Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Target Audience Interests
            </label>
            <div className="p-3 rounded-2xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest, idx) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs border border-slate-200 dark:border-slate-800"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(idx)}
                      className="hover:text-red-500 text-slate-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add interest..."
                  onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                  className="flex-1 text-xs px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Key Competitors */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Key Competitors
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Synthesia
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Canva AI
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

