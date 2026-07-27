import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Play,
  PlayCircle,
  Search,
  Sparkles,
  Video,
  Volume2,
  Zap,
} from 'lucide-react';
import { ViewType } from '../../types';

interface HelpGuideViewProps {
  onNavigate: (view: ViewType) => void;
  onStartTour: () => void;
}

export const HelpGuideView: React.FC<HelpGuideViewProps> = ({
  onNavigate,
  onStartTour,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<
    'All' | 'Brand Brain' | 'AI Models & Credits' | 'Video Studio' | 'Security & Privacy'
  >('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Video Tutorial Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(0);

  const videoChapters = [
    {
      time: '00:00',
      title: 'Platform Overview & Dashboard',
      description: 'Introduction to Lumora Content OS and navigation layout.',
      targetView: 'dashboard' as ViewType,
    },
    {
      time: '01:45',
      title: 'Configuring Brand Brain',
      description: 'Setting mission, swatches, voice tone, and auto-extractor.',
      targetView: 'brand-brain' as ViewType,
    },
    {
      time: '03:30',
      title: 'AI Studio 6-Step Content Wizard',
      description: 'Generating posts, blogs, and scripts with zero prompt engineering.',
      targetView: 'ai-studio' as ViewType,
    },
    {
      time: '05:50',
      title: 'Video Studio & Veo 3.1 AI B-Roll',
      description: 'Timeline editing, vocal synthesis, and scene composition.',
      targetView: 'video-studio' as ViewType,
    },
    {
      time: '08:15',
      title: 'Autonomous AI Agents & Workflows',
      description: 'Automating SEO, competitor tracking, and social publishing.',
      targetView: 'ai-agents' as ViewType,
    },
  ];

  const quickGuides = [
    {
      id: 'g1',
      title: 'Getting Started with Brand Brain',
      desc: 'Learn how persistent memory ensures every AI generation matches your voice.',
      icon: Brain,
      color: 'bg-blue-500/10 text-blue-600',
      view: 'brand-brain' as ViewType,
    },
    {
      id: 'g2',
      title: '6-Step AI Wizard Mastery',
      desc: 'Create high-converting copy for LinkedIn, X, and Instagram in under 30 seconds.',
      icon: Sparkles,
      color: 'bg-amber-500/10 text-amber-600',
      view: 'ai-studio' as ViewType,
    },
    {
      id: 'g3',
      title: 'Veo 3.1 Video Studio Guide',
      desc: 'Build short-form video reels with AI B-roll clips and ElevenLabs voiceovers.',
      icon: Video,
      color: 'bg-indigo-500/10 text-indigo-600',
      view: 'video-studio' as ViewType,
    },
    {
      id: 'g4',
      title: 'Deploying Autonomous Agents',
      desc: 'Automate content research, SEO keyword mapping, and distribution pipelines.',
      icon: Bot,
      color: 'bg-purple-500/10 text-purple-600',
      view: 'ai-agents' as ViewType,
    },
  ];

  const faqs = [
    {
      id: 'faq-1',
      category: 'Brand Brain',
      question: 'What is Brand Brain and how does it affect AI generations?',
      answer:
        'Brand Brain acts as Lumora’s central persistent memory base. Every time you generate content in the AI Studio, Video Studio, or Voice Studio, Lumora automatically injects your business mission, primary tone, target audience interests, and competitor rules into the Gemini 3.6 prompt layer.',
    },
    {
      id: 'faq-2',
      category: 'Brand Brain',
      question: 'Can I auto-extract brand guidelines from my website URL?',
      answer:
        'Yes! In the Brand Brain view, paste your website URL into the AI Website Extractor and click "Auto-Extract". Our research agent scrapes your landing page to extract logos, primary swatches, value propositions, and writing style automatically.',
    },
    {
      id: 'faq-3',
      category: 'AI Models & Credits',
      question: 'Which AI models power Lumora Content OS?',
      answer:
        'Lumora leverages Google Gemini 3.6 Flash for rapid multi-turn text generation, Veo 3.1 for cinematic AI video B-roll clips, Imagen 3 for 4K visual assets, and ElevenLabs for natural vocal cloning and audio synthesis.',
    },
    {
      id: 'faq-4',
      category: 'AI Models & Credits',
      question: 'How are AI Generation Credits calculated?',
      answer:
        'Text generations consume 1-2 credits per post. Image generations consume 5 credits, audio voiceover synthesis consumes 10 credits per minute, and Veo 3.1 video clip generation consumes 25 credits.',
    },
    {
      id: 'faq-5',
      category: 'Video Studio',
      question: 'How do I add voiceovers and AI B-roll to my videos?',
      answer:
        'Open Video Studio, select a scene in the Interactive Scene Timeline, and click "Generate AI B-Roll Clip" or "Synthesize Voiceover". You can select from 8 pre-cloned voice styles or clone your own voice in Voice Studio.',
    },
    {
      id: 'faq-6',
      category: 'Security & Privacy',
      question: 'Is my brand data kept confidential and secure?',
      answer:
        'Absolutely. Your Brand Brain memory and generated content are stored in enterprise-grade isolated containers and are never used to train public foundational AI models.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Top Banner & Search */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
              <LifeBuoy className="w-3.5 h-3.5 text-blue-400" /> Platform Knowledge & Video Tutorial
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Help Center & Learning Hub
            </h1>
            <p className="text-xs text-slate-300">
              Master Lumora Content OS with interactive video walkthroughs, step-by-step documentation, and FAQs.
            </p>
          </div>

          <button
            onClick={onStartTour}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all self-start md:self-auto active:scale-95"
          >
            <Compass className="w-4 h-4" /> Take Guided Product Tour
          </button>
        </div>

        {/* FAQ Search Input */}
        <div className="relative max-w-2xl">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics, tutorials, or FAQs (e.g. Brand Brain, Veo B-Roll, Credits)..."
            className="w-full text-xs pl-11 pr-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* YOUTUBE PLATFORM VIDEO TUTORIAL PLAYER SECTION */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Official Platform YouTube Tutorial
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10-Minute comprehensive video walkthrough for new creators.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            1080p HD • 10m 15s
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Simulated Video Canvas / Embedded Player */}
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col justify-between p-4 group">
            {/* Background Thumbnail Image */}
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
              alt="YouTube Tutorial"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isPlaying ? 'opacity-40' : 'opacity-70'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

            {/* Video Top Controls Overlay */}
            <div className="relative z-10 flex justify-between items-center text-white">
              <span className="text-xs font-bold bg-red-600 px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Play className="w-3 h-3 fill-current" /> YOUTUBE TUTORIAL
              </span>
              <span className="text-xs font-mono bg-black/60 backdrop-blur-md px-2 py-0.5 rounded">
                Chapter {selectedChapter + 1}: {videoChapters[selectedChapter].time}
              </span>
            </div>

            {/* Center Play Button Overlay */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center space-y-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <span className="font-bold text-lg">❚❚</span>
                ) : (
                  <Play className="w-8 h-8 ml-1 fill-current" />
                )}
              </button>
              <p className="text-xs font-bold text-white drop-shadow-md">
                {isPlaying ? 'Playing Tutorial Simulation...' : 'Click to Watch Video Guide'}
              </p>
            </div>

            {/* Video Player Bottom Timeline Controls */}
            <div className="relative z-10 space-y-2 text-white">
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="bg-red-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((selectedChapter + 1) / videoChapters.length) * 100}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono text-slate-300">
                <span>{videoChapters[selectedChapter].time} / 10:15</span>
                <div className="flex items-center gap-3">
                  <Volume2 className="w-3.5 h-3.5 cursor-pointer" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Gemini 3.6 Flash Voiceover
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Video Chapters List */}
          <div className="space-y-3 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Video Chapters
            </h3>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-72 pr-1 custom-scroll">
              {videoChapters.map((ch, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedChapter(idx);
                    setIsPlaying(true);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedChapter === idx
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
                      {ch.time}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(ch.targetView);
                      }}
                      className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Try View <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {ch.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {ch.description}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* QUICK START GUIDES GRID */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
          Quick Start Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickGuides.map((guide) => {
            const Icon = guide.icon;
            return (
              <div
                key={guide.id}
                onClick={() => onNavigate(guide.view)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl w-fit ${guide.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {guide.desc}
                  </p>
                </div>

                <div className="pt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span>Open Module</span> →
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear answers to common platform, AI model, and usage questions.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {(
              ['All', 'Brand Brain', 'AI Models & Credits', 'Video Studio', 'Security & Privacy'] as const
            ).map((cat) => (
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

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              No FAQs matched your search query. Try another keyword or take the guided tour!
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
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        {faq.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
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

      {/* COMMUNITY SUPPORT & CONTACT FOOTER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold">Need personalized assistance?</h3>
          <p className="text-xs text-blue-100">
            Join our 24/7 Creator Community on Discord or submit a direct ticket to our AI engineers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Support Ticket Dialog Opened!')}
            className="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4" /> Live Support Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
