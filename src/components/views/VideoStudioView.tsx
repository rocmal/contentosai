import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Mic,
  MoreVertical,
  Music,
  Pause,
  Play,
  Plus,
  Redo,
  Scissors,
  Share2,
  Sparkles,
  Trash2,
  Undo,
  Volume2,
  Wand2,
} from 'lucide-react';
import { ViewType } from '../../types';

interface VideoStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({ onNavigate }) => {
  const [selectedProject, setSelectedProject] = useState('Cyberpunk_Promo_V2');
  const [activeTab, setActiveTab] = useState<'audio' | 'visuals'>('audio');
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4K'>('16:9');
  const [pitch, setPitch] = useState(50);
  const [timecode, setTimecode] = useState('00:00:04:12');
  const [zoomLevel, setZoomLevel] = useState('1.0x');
  const [brollPrompt, setBrollPrompt] = useState('');

  // Scenes list state
  const [scenes, setScenes] = useState([
    {
      id: 'sc1',
      title: '01 Intro sequence',
      duration: '00:04s',
      thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
      active: true,
    },
    {
      id: 'sc2',
      title: '02 Core concept',
      duration: '00:12s',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=80',
      active: false,
    },
  ]);

  // B-Roll clips state
  const [brollClips, setBrollClips] = useState([
    {
      id: 'br1',
      url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'br2',
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=80',
    },
  ]);

  const handleGenerateBroll = () => {
    const newClip = {
      id: `br-${Date.now()}`,
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80',
    };
    setBrollClips((prev) => [newClip, ...prev]);
    setBrollPrompt('');
  };

  const handleAddScene = () => {
    const newScene = {
      id: `sc-${Date.now()}`,
      title: `0${scenes.length + 1} New sequence`,
      duration: '00:08s',
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
      active: false,
    };
    setScenes([...scenes, newScene]);
  };

  return (
    <div className="bg-[#0b1120] text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl min-h-[850px] flex flex-col -m-2 sm:m-0 animate-in fade-in duration-200">
      {/* Top Header Bar inside Video Studio Workspace */}
      <div className="bg-[#0f172a] px-4 md:px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Project:</span>
          <div className="relative group">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-blue-400 font-bold text-sm px-3 py-1.5 pr-8 rounded-lg outline-none cursor-pointer transition-all"
            >
              <option value="Cyberpunk_Promo_V2">Cyberpunk_Promo_V2</option>
              <option value="Product_Launch_Teaser">Product_Launch_Teaser</option>
              <option value="AI_Brand_Explainer">AI_Brand_Explainer</option>
            </select>
            <ChevronDown className="w-4 h-4 text-blue-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Video rendered & exported successfully!')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export
          </button>

          <button
            onClick={() => alert('Shareable Preview Link copied to clipboard!')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Preview
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Bell & User Avatar */}
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
          </button>

          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="User Avatar"
            className="w-7 h-7 rounded-full object-cover border border-slate-700"
          />
        </div>
      </div>

      {/* Main Workspace Body (3 Columns Top + Bottom Timeline) */}
      <div className="flex-1 flex flex-col">
        {/* Top Split: Left Scenes/B-roll | Center Canvas | Right Audio/Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-800 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* LEFT PANEL: SCENES & AI B-ROLL GENERATOR (3 cols) */}
          <div className="lg:col-span-3 p-4 bg-[#0d1424] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* SCENES Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    SCENES
                  </h3>
                  <button
                    onClick={handleAddScene}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors"
                    title="Add Scene"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {scenes.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() =>
                        setScenes(
                          scenes.map((s) => ({ ...s, active: s.id === sc.id }))
                        )
                      }
                      className={`p-2 rounded-xl flex items-center gap-3 cursor-pointer border transition-all ${
                        sc.active
                          ? 'bg-blue-950/60 border-blue-600/80 ring-1 ring-blue-500/30'
                          : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                      }`}
                    >
                      <img
                        src={sc.thumbnail}
                        alt={sc.title}
                        className="w-12 h-8 rounded-lg object-cover bg-slate-950"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{sc.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{sc.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI B-ROLL GENERATOR Section */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI B-ROLL GENERATOR</span>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={brollPrompt}
                    onChange={(e) => setBrollPrompt(e.target.value)}
                    placeholder="Describe the scene you need..."
                    className="w-full text-xs p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors resize-none h-20"
                  />
                  <button
                    onClick={handleGenerateBroll}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-98"
                  >
                    Generate Clip
                  </button>
                </div>

                {/* B-Roll Thumbnail Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {brollClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group relative cursor-pointer"
                    >
                      <img
                        src={clip.url}
                        alt="B-roll"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER PANEL: VIDEO PREVIEW CANVAS (6 cols) */}
          <div className="lg:col-span-6 p-4 md:p-6 bg-[#0a0f1d] flex flex-col items-center justify-center space-y-4">
            {/* Cyberpunk Video Player Screen */}
            <div
              className={`w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative group flex items-center justify-center transition-all ${
                aspectRatio === '9:16'
                  ? 'aspect-[9/16] max-w-sm'
                  : aspectRatio === '1:1'
                  ? 'aspect-square max-w-md'
                  : 'aspect-video'
              }`}
            >
              <img
                src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80"
                alt="Cyberpunk Preview"
                className="w-full h-full object-cover"
              />

              {/* Play Button Overlay */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute p-4 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all backdrop-blur-xs"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Aspect Ratio Switcher Bar */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-400">
              {(['16:9', '9:16', '1:1', '4K'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    aspectRatio === ratio
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL: AUDIO & VISUALS TAB (3 cols) */}
          <div className="lg:col-span-3 p-4 bg-[#0d1424] space-y-5">
            {/* Top Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-2 text-center text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === 'audio'
                    ? 'text-blue-400 border-blue-500'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                AUDIO
              </button>
              <button
                onClick={() => setActiveTab('visuals')}
                className={`flex-1 py-2 text-center text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === 'visuals'
                    ? 'text-blue-400 border-blue-500'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                VISUALS
              </button>
            </div>

            {activeTab === 'audio' ? (
              <div className="space-y-5">
                {/* VOICEOVER Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      <Mic className="w-3.5 h-3.5 text-blue-400" />
                      <span>VOICEOVER</span>
                    </div>
                    <button
                      onClick={() => alert('Voice customization opened!')}
                      className="text-[10px] text-blue-400 hover:underline font-semibold"
                    >
                      Customize
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Liam - Narrative</h4>
                        <p className="text-[10px] text-slate-400">English (US) • Professional</p>
                      </div>
                    </div>

                    {/* Pitch Slider */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Pitch</span>
                        <span>Medium</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={pitch}
                        onChange={(e) => setPitch(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* MUSIC LIBRARY Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    <Music className="w-3.5 h-3.5 text-blue-400" />
                    <span>MUSIC LIBRARY</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-blue-950/60 text-blue-400">
                          <Music className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Urban Pulsar</p>
                          <p className="text-[10px] text-slate-400">Lo-fi • 02:45</p>
                        </div>
                      </div>
                      <button className="text-slate-500 hover:text-slate-300 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-slate-800 text-slate-400">
                          <Music className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Midnight Drift</p>
                          <p className="text-[10px] text-slate-400">Synthwave • 03:12</p>
                        </div>
                      </div>
                      <button className="text-slate-500 hover:text-slate-300 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* THUMBNAIL GENERATION Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>THUMBNAIL GENERATION</span>
                  </div>

                  <div
                    onClick={() => alert('AI Thumbnail generated successfully!')}
                    className="p-6 rounded-xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 hover:bg-slate-900/80 transition-all flex items-center justify-center cursor-pointer group"
                  >
                    <Wand2 className="w-6 h-6 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 space-y-3">
                <p>Visual Effects & Motion Graphics Controls</p>
                <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs">
                  Load Visual Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM FULL-WIDTH PANEL: TIMELINE EDITOR */}
        <div className="bg-[#090e1a] p-3 md:p-4 border-t border-slate-800 space-y-3">
          {/* Timeline Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
            {/* Editing Tools */}
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300">
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300">
                <Redo className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-px bg-slate-800" />
              <button className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300">
                <Scissors className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timecode & Play controls */}
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-semibold text-xs">Zoom: {zoomLevel}</span>
              <span className="text-blue-400 font-bold text-sm tracking-wider">{timecode}</span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Timeline Ruler & Track Canvas */}
          <div className="relative rounded-xl bg-[#060a12] border border-slate-800/80 p-3 overflow-x-auto space-y-2">
            {/* Timeline Playhead line (Red) */}
            <div className="absolute top-0 bottom-0 left-[26%] w-0.5 bg-red-500 z-20 pointer-events-none">
              <div className="w-2.5 h-2.5 bg-red-500 rotate-45 -translate-x-[4px] -translate-y-1" />
            </div>

            {/* Time Ruler */}
            <div className="flex text-[10px] text-slate-500 font-mono border-b border-slate-800/80 pb-1 pl-20 space-x-16">
              <span>0:10</span>
              <span>0:15</span>
              <span>0:20</span>
              <span>0:25</span>
              <span>0:30</span>
            </div>

            {/* Track 1: VIDEO */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <Film className="w-3 h-3 text-blue-400" /> VIDEO
              </span>
              <div className="flex-1 bg-slate-900/60 h-9 rounded-lg border border-slate-800 relative overflow-hidden flex items-center px-2">
                <div className="absolute left-[18%] w-[45%] h-7 bg-blue-900/50 border border-blue-500/80 rounded-md flex items-center gap-2 px-2 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&auto=format&fit=crop&q=80"
                    alt="clip"
                    className="w-5 h-5 rounded object-cover"
                  />
                  <span className="text-[10px] font-bold text-blue-200 truncate">
                    Scene_02_Tech_Detail.mp4
                  </span>
                </div>
              </div>
            </div>

            {/* Track 2: AUDIO */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <Mic className="w-3 h-3 text-emerald-400" /> AUDIO
              </span>
              <div className="flex-1 bg-slate-900/60 h-8 rounded-lg border border-slate-800 relative overflow-hidden flex items-center">
                <div className="absolute left-[18%] w-[45%] h-6 bg-emerald-950/60 border border-emerald-600/60 rounded-md flex items-center justify-around px-2 opacity-80">
                  <div className="h-2 w-full bg-emerald-500/30 rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            {/* Track 3: SUBS */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <Layers className="w-3 h-3 text-purple-400" /> SUBS
              </span>
              <div className="flex-1 bg-slate-900/60 h-8 rounded-lg border border-slate-800 relative flex items-center gap-2 px-2">
                <div className="absolute left-[18%] w-[25%] h-6 bg-purple-900/40 border border-purple-500/60 rounded-md flex items-center px-2">
                  <span className="text-[9px] font-semibold text-purple-200 truncate">
                    Technology redefined our vision.
                  </span>
                </div>
                <div className="absolute left-[45%] w-[18%] h-6 bg-purple-900/40 border border-purple-500/60 rounded-md flex items-center px-2">
                  <span className="text-[9px] font-semibold text-purple-200 truncate">
                    Explore Lumora...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

