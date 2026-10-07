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

const HOW_TO: { id: string; title: string; steps: string[]; view: ViewType; action: string }[] = [
  {
    id: 'h-image',
    title: 'Make an image for several platforms',
    steps: [
      'Open Image Studio and describe the picture. Tap "Improve with AI" for a more detailed prompt, or "Speak" to say it aloud.',
      'Tick every place you will post it. Each one gets its own exact size.',
      'Choose a quality, check the credit cost, and press Generate.',
      'Preview each result, then "Save to gallery" for the ones you want to keep.',
    ],
    view: 'image-studio',
    action: 'Open Image Studio',
  },
  {
    id: 'h-video',
    title: 'Make a video from a prompt',
    steps: [
      'Open Video Studio. Pick a template (for example "Family protection") or write your own idea.',
      'Edit the words to match your business, then choose a format - reel, square, widescreen or product ad.',
      'Press Generate. It usually takes a minute or two.',
      'Add narration or text, then download it or schedule it to your social accounts.',
    ],
    view: 'video-studio',
    action: 'Open Video Studio',
  },
  {
    id: 'h-voice',
    title: 'Record your own voice',
    steps: [
      'Open Voice Studio and choose "Record your own voice".',
      'Read the sample text aloud for at least 30 seconds, somewhere quiet and close to the microphone.',
      'Play it back, give the voice a name, and confirm it is your own voice (or you have permission).',
      'Your voice now appears under "My recorded voices" for any script.',
    ],
    view: 'voice-studio',
    action: 'Open Voice Studio',
  },
  {
    id: 'h-again',
    title: 'Start again from something you made',
    steps: [
      'Open Gallery and choose the "Creation history" tab.',
      'Find the item - you can search by what you asked for.',
      'Press "Create again". The right studio opens with the same prompt filled in.',
      'Change a word or two and generate.',
    ],
    view: 'media-library',
    action: 'Open Gallery',
  },
];

const FAQS: { id: string; category: Exclude<Category, 'All'>; question: string; answer: string }[] = [
  {
    id: 'faq-1',
    category: 'Getting started',
    question: 'What can I do in Lumora?',
    answer:
      'Lumora has three studios: Image Studio for pictures, Video Studio for short videos, and Voice Studio for voiceovers. Everything you save goes to your Gallery, and your Dashboard shows your credits and recent work.',
  },
  {
    id: 'faq-2',
    category: 'Getting started',
    question: 'Can I type in Hindi or Punjabi?',
    answer:
      'Yes. Use the "Speak" button next to a prompt or script box and talk in Hindi, Punjabi or English - Lumora types it for you. You can also type in those languages directly. Voice Studio has Indian-language voices.',
  },
  {
    id: 'faq-3',
    category: 'Studios',
    question: 'Why is the text in my image wrong or missing?',
    answer:
      'AI image tools often misspell words and numbers. "No text in the image" is ticked by default for that reason - add your name and phone number afterwards in a design tool. If you untick it so the picture includes your wording, check every letter and digit before posting.',
  },
  {
    id: 'faq-4',
    category: 'Studios',
    question: 'How long does a video take, and how long can it be?',
    answer:
      'Usually a minute or two, sometimes longer when the AI service is busy. AI clips are 4 to 8 seconds long. The format you choose (reel, square, widescreen) sets the shape. You can add narration and text in the editing step afterwards.',
  },
  {
    id: 'faq-5',
    category: 'Studios',
    question: 'How do I record my own voice?',
    answer:
      'In Voice Studio choose "Record your own voice", read the sample aloud for at least 30 seconds, name it and confirm it is your own voice. It then appears in your voice list. If you see a "not set up" message, voice recording is not switched on for your account yet - contact support.',
  },
  {
    id: 'faq-6',
    category: 'Credits',
    question: 'How are credits used?',
    answer:
      'Credits are taken when you generate, and the cost is shown before you press the button. An image costs 2 to 50 credits depending on quality. A voiceover costs about 7 credits per minute with Indian-language voices. An AI video costs about 180 credits for a clip of up to 10 seconds, taken when the job starts. If a request is turned down before it starts, no credits are used. The credits in your plan are topped up each month, and unused credits do not carry over. New workspaces get a small one-time free allowance. The Dashboard shows what you have used by studio.',
  },
  {
    id: 'faq-6b',
    category: 'Credits',
    question: 'What if a generation fails or the result is not what I wanted?',
    answer:
      'If an image or video request is turned down before it starts, nothing is charged and you will see a message saying so. A video that is accepted but fails later still uses its credits, so please contact support and we will look into it. A result that simply is not what you hoped for counts as a normal generation - try "Improve with AI" on the prompt, or start again from the Gallery with small changes.',
  },
  {
    id: 'faq-7',
    category: 'Credits',
    question: 'Do I pay again if I make the same video twice?',
    answer:
      'No. If you ask Video Studio for the same prompt, length and format again, you get your saved video straight away, free. Use "Make a new version" if you want a fresh one - that uses credits.',
  },
  {
    id: 'faq-8',
    category: 'Gallery & team',
    question: 'Where do my creations go?',
    answer:
      'Videos and voiceovers are saved automatically. Images are kept only when you press "Save to gallery". Find everything in Gallery, under "My gallery", and see what you asked for under "Creation history".',
  },
  {
    id: 'faq-9',
    category: 'Gallery & team',
    question: 'Can my team see what I make?',
    answer:
      'Yes - "Team gallery" shows everything saved in your workspace, with who made it. Only the person who made an item (or a workspace admin) can rename or delete it.',
  },
  {
    id: 'faq-10',
    category: 'Gallery & team',
    question: 'How do I start again from something I made before?',
    answer:
      'Open Gallery, go to "Creation history" (or find it on your Dashboard under "Pick up where you left off") and press "Create again". The studio opens with that prompt filled in. Items saved before this feature was added do not have a saved prompt.',
  },
  {
    id: 'faq-11',
    category: 'Gallery & team',
    question: 'Which social accounts can I post to?',
    answer:
      'Connect your accounts in Integrations - Facebook, Instagram, LinkedIn and YouTube are supported. Then use the schedule option when your video is finished in Video Studio. Scheduled posts show in Calendar.',
  },
  {
    id: 'faq-12',
    category: 'Safety & privacy',
    question: 'Can I post AI-made content as it is, for insurance or finance?',
    answer:
      'Treat everything as a draft. AI can get faces, numbers and wording wrong. Before posting, check names, phone numbers and licence details, and make sure nothing promises returns or benefits you cannot stand behind. Follow your regulator\'s advertising rules (for example IRDAI for insurance).',
  },
  {
    id: 'faq-13',
    category: 'Safety & privacy',
    question: 'Is my content private?',
    answer:
      'Your creations are visible only to people in your workspace. Your prompts are sent to the AI providers we use to make the result, under their API terms. We do not use your content to train our own models. Only record a voice that is yours, or that you have permission to use.',
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
