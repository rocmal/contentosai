import React, { useState } from 'react';
import { Download, Mic, Play, Radio, Volume2 } from 'lucide-react';
import { ViewType } from '../../types';

interface VoiceStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

export const VoiceStudioView: React.FC<VoiceStudioViewProps> = ({ onNavigate }) => {
  const [text, setText] = useState(
    "Welcome to Lumora — the AI Content Operating System designed for high-growth tech teams. Scale your multi-channel marketing with a unified Brand Memory."
  );
  const [voice, setVoice] = useState('Sarah - Tech Executive (ElevenLabs)');
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  const voices = [
    { id: 'Sarah - Tech Executive (ElevenLabs)', name: 'Sarah', type: 'Tech & Professional', accent: 'US Natural' },
    { id: 'Marcus - Deep Narrator (Cartesia)', name: 'Marcus', type: 'Documentary & Ad', accent: 'UK Deep' },
    { id: 'Elena - Conversational Podcast', name: 'Elena', type: 'Podcast & Social', accent: 'US Warm' },
    { id: 'Alex Rivera - Vocal Clone', name: 'Alex (Clone)', type: 'Custom Brand Voice', accent: 'Verified Vocal Clone' },
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <Mic className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Voice Studio & Vocal Cloning
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Text-to-Speech synthesis with emotional controls and instant voice cloning.
          </p>
        </div>

        <button
          onClick={() => alert('Vocal clone uploaded & trained successfully!')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs transition-all"
        >
          <Radio className="w-4 h-4 text-emerald-400" /> Clone New Voice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voices Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available AI Voices
          </h3>
          {voices.map((v) => (
            <div
              key={v.id}
              onClick={() => setVoice(v.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                voice === v.id
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{v.name}</h4>
                <p className="text-[10px] text-slate-500">{v.type} • {v.accent}</p>
              </div>
              <Volume2 className={`w-4 h-4 ${voice === v.id ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
          ))}
        </div>

        {/* Text Area & Audio Synthesizer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Script & Voice Synthesis
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Script Content
              </label>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Pacing / Speed ({speed}x)
                </label>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            {/* Audio Waveform Player */}
            <div className="p-4 rounded-xl bg-slate-950 text-white flex items-center justify-between gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>

              <div className="flex-1 flex items-center gap-1 h-8">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full bg-blue-500/80 transition-all ${
                      isPlaying ? 'animate-pulse' : ''
                    }`}
                    style={{ height: `${Math.max(20, Math.sin(i) * 100)}%` }}
                  />
                ))}
              </div>

              <button
                onClick={() => alert('WAV Audio file downloaded!')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
