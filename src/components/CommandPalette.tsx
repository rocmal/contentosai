import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  Brain,
  Calendar,
  FolderKanban,
  Image,
  Layers,
  LayoutDashboard,
  Mic,
  Search,
  Sparkles,
  Store,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { ViewType } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
  onRunQuickAI: (prompt: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onRunQuickAI,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'ai-studio', label: 'Launch 6-Step AI Wizard', view: 'ai-studio' as ViewType, icon: Sparkles, cat: 'AI Action' },
    { id: 'gen-post', label: 'Generate LinkedIn Post from Brand Brain', prompt: 'Write a viral LinkedIn carousel about AI SaaS trends', icon: Sparkles, cat: 'Quick AI' },
    { id: 'brand-brain', label: 'Open Brand Brain Knowledge Base', view: 'brand-brain' as ViewType, icon: Brain, cat: 'Navigation' },
    { id: 'calendar', label: 'View Content Calendar & Schedule', view: 'calendar' as ViewType, icon: Calendar, cat: 'Navigation' },
    { id: 'automation', label: 'Open n8n Workflow Builder', view: 'automation' as ViewType, icon: Zap, cat: 'Navigation' },
    { id: 'video-studio', label: 'Create New Video Script & AI Shots', view: 'video-studio' as ViewType, icon: Video, cat: 'Studio' },
    { id: 'image-studio', label: 'Generate AI Graphic Thumbnail', view: 'image-studio' as ViewType, icon: Image, cat: 'Studio' },
    { id: 'voice-studio', label: 'Clone Voice or Generate Voiceover', view: 'voice-studio' as ViewType, icon: Mic, cat: 'Studio' },
    { id: 'ai-agents', label: 'View 10 Autonomous AI Agents', view: 'ai-agents' as ViewType, icon: Bot, cat: 'Operations' },
    { id: 'analytics', label: 'Executive Analytics & Strategy Insights', view: 'analytics' as ViewType, icon: BarChart3, cat: 'Analytics' },
    { id: 'marketplace', label: 'Explore Industry Packs (B2B, Real Estate, Ecom)', view: 'marketplace' as ViewType, icon: Store, cat: 'Marketplace' },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search pages, or run AI generation..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto space-y-1 custom-scroll">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching actions or pages found. Try searching "Wizard", "Brand", or "Video".
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.view) {
                      onNavigate(item.view);
                    } else if (item.prompt) {
                      onRunQuickAI(item.prompt);
                    }
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-600 dark:text-slate-300 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.cat}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                    Jump ↵
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↵</kbd> Select</span>
          </div>
          <span>Lumora Command Palette</span>
        </div>
      </div>
    </div>
  );
};
