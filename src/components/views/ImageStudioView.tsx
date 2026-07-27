import React, { useState } from 'react';
import {
  Download,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minimize2,
  Scissors,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { ViewType } from '../../types';

interface ImageStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({ onNavigate }) => {
  const [prompt, setPrompt] = useState(
    'Sleek 3D glassmorphism interface graphic showing an AI Content Operating System with glowing blue nodes, modern typography, 8k resolution'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:5'>('16:9');
  const [stylePreset, setStylePreset] = useState('3D Tech Render');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
  );

  const stylePresets = [
    '3D Tech Render',
    'Photorealistic 8K',
    'Cyberpunk Neon',
    'Minimalist Flat',
    'Vector Illustration',
  ];

  const handleGenerateImage = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedImg(
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80'
      );
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Image Studio & Brand Graphic Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate graphics, remove backgrounds, 4K upscale, and magic resize for all channels.
          </p>
        </div>

        <button
          onClick={() => alert('High-resolution graphic downloaded!')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Download className="w-4 h-4" /> Download Graphic
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Prompt & Controls */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Prompt & Style Configuration
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Image Description / Prompt
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Aspect Ratio (Magic Resize)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '16:9', label: '16:9 Banner' },
                  { id: '1:1', label: '1:1 Square' },
                  { id: '9:16', label: '9:16 Vertical' },
                  { id: '4:5', label: '4:5 Portrait' },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      aspectRatio === ar.id
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Style Preset
              </label>
              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              >
                {stylePresets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Rendering Image...' : 'Generate AI Image'}</span>
            </button>
          </div>

          {/* Tools: Bg Removal & Upscaling */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
              AI Editing Utilities
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => alert('Background removed!')}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Scissors className="w-3.5 h-3.5 text-blue-500" /> Remove Bg
              </button>
              <button
                onClick={() => alert('Image upscaled to 4K resolution!')}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-500" /> 4K Upscale
              </button>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Main Canvas Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl group">
            {isGenerating ? (
              <div className="text-center space-y-3">
                <Sparkles className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Rendering high-fidelity graphic with Flux Pro...</p>
              </div>
            ) : (
              <img
                src={generatedImg}
                alt="Generated Output"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
