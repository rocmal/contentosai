import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  FolderOpen,
  Image as ImageIcon,
  LifeBuoy,
  Mic,
  Search,
  Send,
  Video,
} from 'lucide-react';
import { ViewType } from '../../types';
import { FAQS, HOW_TO, type FaqCategory } from '../../lib/helpContent';

interface HelpGuideViewProps {
  onNavigate: (view: ViewType) => void;
  onStartTour: () => void;
}

const CATEGORIES = ['All', 'Getting started', 'Studios', 'Credits', 'Gallery & team', 'Safety & privacy'] as const;
type Category = (typeof CATEGORIES)[number];

const QUICK_GUIDES: {
  id: string;
  title: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  view: ViewType;
}[] = [
  {
    id: 'g-image',
    title: 'Image Studio',
    desc: 'Describe a picture, tick where you will post it, and get the right size for each platform.',
    icon: ImageIcon,
    color: 'bg-blue-500/10 text-blue-600',
    view: 'image-studio',
  },
  {
    id: 'g-video',
    title: 'Video Studio',
    desc: 'Make a short video from a prompt or a ready-made template, add narration, then download or schedule it.',
    icon: Video,
    color: 'bg-teal-500/10 text-teal-600',
    view: 'video-studio',
  },
  {
    id: 'g-voice',
    title: 'Voice Studio',
    desc: 'Turn a script into a voiceover in Hindi, Punjabi or English - or record your own voice and reuse it.',
    icon: Mic,
    color: 'bg-emerald-500/10 text-emerald-600',
    view: 'voice-studio',
  },
  {
    id: 'g-gallery',
    title: 'Gallery & history',
    desc: 'Find what you and your team made, rename or download it, and start again from any past creation.',
    icon: FolderOpen,
    color: 'bg-amber-500/10 text-amber-600',
    view: 'media-library',
  },
  {
    id: 'g-publish',
    title: 'Connect Instagram & Facebook',
    desc: 'Link your accounts once, then schedule finished videos straight from Video Studio.',
    icon: Send,
    color: 'bg-pink-500/10 text-pink-600',
    view: 'integrations',
  },
];

export const HelpGuideView: React.FC<HelpGuideViewProps> = ({ onNavigate, onStartTour }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [expandedHowTo, setExpandedHowTo] = useState<string | null>('h-image');

  const query = searchQuery.trim().toLowerCase();
  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch =
      !query || faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  const filteredHowTo = HOW_TO.filter(
    (guide) =>
      !query ||
      guide.title.toLowerCase().includes(query) ||
      guide.steps.some((step) => step.toLowerCase().includes(query)),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Top banner & search */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
              <LifeBuoy className="w-3.5 h-3.5 text-blue-400" /> Help Center
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">How can we help?</h1>
            <p className="text-xs text-slate-300">
              Short guides for each studio, and answers to the questions people ask most.
            </p>
          </div>

          <button
            onClick={onStartTour}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all self-start md:self-auto active:scale-95"
          >
            <Compass className="w-4 h-4" /> Take the quick tour
          </button>
        </div>

        <div className="relative max-w-2xl">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help (for example credits, voice, Instagram, gallery)..."
            className="w-full text-xs pl-11 pr-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick start */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Start here</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_GUIDES.map((guide) => {
            const Icon = guide.icon;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => onNavigate(guide.view)}
                className="text-left p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col gap-3 group"
              >
                <div className={`p-3 rounded-xl w-fit ${guide.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {guide.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{guide.desc}</p>
                <span className="mt-auto text-[11px] font-bold text-blue-600 dark:text-blue-400">Open →</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step-by-step guides */}
      {filteredHowTo.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Step by step</h2>
          <div className="space-y-3">
            {filteredHowTo.map((guide) => {
              const isOpen = expandedHowTo === guide.id;
              return (
                <div
                  key={guide.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedHowTo(isOpen ? null : guide.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{guide.title}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <ol className="space-y-2">
                        {guide.steps.map((step, index) => (
                          <li key={step} className="flex gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                      <button
                        type="button"
                        onClick={() => onNavigate(guide.view)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {guide.action} →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Frequently asked questions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick answers about the studios, credits and your Gallery.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              Nothing matched that search. Try another word, or take the quick tour.
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-3 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0">
                        {faq.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{faq.question}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60 pt-3 animate-in fade-in duration-150">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
