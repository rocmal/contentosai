import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Sparkles,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { ViewType } from '../types';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
  onOpenVideoTutorial?: () => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenVideoTutorial,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'step-1',
      title: 'Welcome to Lumora Content OS',
      badge: 'Step 1 of 5 • Introduction',
      icon: Sparkles,
      iconBg: 'bg-blue-500/10 text-blue-500',
      description:
        'Lumora is your all-in-one AI Content Operating System. Powered by Gemini 3.6 Flash and specialized AI engines, it transforms strategy into multi-channel campaigns with persistent brand memory.',
      highlightTitle: 'Core Value Proposition',
      highlights: [
        'Persistent Brand Brain context across all generations',
        'Zero-prompt 6-step AI Studio Content Wizard',
        'Veo 3.1 AI B-Roll & ElevenLabs Voice Studio',
      ],
      targetView: 'dashboard' as ViewType,
      image:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'step-2',
      title: 'Brand Brain Memory Base',
      badge: 'Step 2 of 5 • Brand Knowledge',
      icon: Brain,
      iconBg: 'bg-teal-500/10 text-teal-500',
      description:
        'Set up your Brand Brain once. It stores your company mission, voice tone, color swatches, logo assets, and target audience personas to keep all generated content 100% on-brand.',
      highlightTitle: 'Key Features in Brand Brain',
      highlights: [
        'AI Website Extractor to auto-import guidelines',
        'Custom tone presets (Professional, Witty, Authoritative)',
        'Audience interest tagging & key competitor tracking',
      ],
      targetView: 'brand-brain' as ViewType,
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'step-3',
      title: 'Multi-Model AI Content Wizard',
      badge: 'Step 3 of 5 • Copy & Media Studio',
      icon: Zap,
      iconBg: 'bg-amber-500/10 text-amber-500',
      description:
        'Generate blogs, social posts, newsletters, and ad scripts with zero prompt engineering required. Select your goal, audience, and platform format.',
      highlightTitle: 'AI Studio Capabilities',
      highlights: [
        '6-step guided wizard for structured outputs',
        'Model selector (Gemini 3.6, Claude 3.5, GPT-4o)',
        '1-Click schedule to Content Calendar',
      ],
      targetView: 'ai-studio' as ViewType,
      image:
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'step-4',
      title: 'Video Studio & Veo 3.1 AI B-Roll',
      badge: 'Step 4 of 5 • Video Production',
      icon: Video,
      iconBg: 'bg-indigo-500/10 text-indigo-500',
      description:
        'Build cinematic product teasers and reels with interactive scene timelines, voiceover synthesis, AI-generated B-roll clips, and captions.',
      highlightTitle: 'Video Studio Features',
      highlights: [
        'Veo 3.1 cinematic B-roll clip generator',
        'ElevenLabs vocal cloning & music library',
        'Multi-track timeline editor (Video, Audio, Captions)',
      ],
      targetView: 'video-studio' as ViewType,
      image:
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'step-5',
      title: 'AI Agents Fleet & Video Tutorial',
      badge: 'Step 5 of 5 • Autopilot & Help',
      icon: Bot,
      iconBg: 'bg-purple-500/10 text-purple-500',
      description:
        'Deploy 10 autonomous agents for SEO research, competitor tracking, and auto-publishing. Need extra help? Watch our full platform YouTube video tutorial anytime!',
      highlightTitle: 'Next Steps',
      highlights: [
        'Explore 10 pre-built autonomous agents',
        'Watch the YouTube platform video walkthrough',
        'Browse our interactive FAQ & help center',
      ],
      targetView: 'help' as ViewType,
      image:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      onNavigate(steps[nextIndex].targetView);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      onNavigate(steps[prevIndex].targetView);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Close Tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Top Banner Image & Badge */}
        <div className="relative h-48 bg-slate-950 overflow-hidden flex items-center justify-center">
          <img
            src={current.image}
            alt={current.title}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-black/30" />

          {/* Floating Icon Badge */}
          <div className="absolute bottom-4 left-6 flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${current.iconBg} backdrop-blur-md border border-white/20 shadow-lg`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold shadow-xs">
                {current.badge}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white drop-shadow-sm mt-1">
                {current.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-4 flex-1">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {current.description}
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {current.highlightTitle}
            </span>
            <div className="space-y-1.5">
              {current.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStep(idx);
                  onNavigate(steps[idx].targetView);
                }}
                className={`h-2 rounded-full transition-all ${
                  currentStep === idx
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep === steps.length - 1 && onOpenVideoTutorial && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVideoTutorial();
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <PlayCircle className="w-4 h-4" /> Watch Video Tutorial
              </button>
            )}

            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
