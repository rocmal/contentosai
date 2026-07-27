import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Globe,
  Layers,
  Megaphone,
  Share2,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { AIResponsePayload, BrandBrain, ViewType, WizardState } from '../../types';

interface AIStudioViewProps {
  brandBrain: BrandBrain;
  onNavigate: (view: ViewType) => void;
  onSaveToCalendar: (item: any) => void;
}

export const AIStudioView: React.FC<AIStudioViewProps> = ({
  brandBrain,
  onNavigate,
  onSaveToCalendar,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<AIResponsePayload | null>(null);

  const [wizardState, setWizardState] = useState<WizardState>({
    contentType: 'LinkedIn Post',
    goal: 'Lead Generation',
    audience: brandBrain.targetAudience || 'Tech Decision Makers & Product Managers',
    brandContext: `${brandBrain.businessName} - ${brandBrain.tagline}`,
    aiProvider: 'Gemini 3.6 Flash',
    topic: 'How AI Content Operating Systems supercharge B2B SaaS teams in 2026',
    customPrompt: '',
  });

  const contentTypes = [
    { id: 'LinkedIn Post', label: 'LinkedIn Post / Carousel', desc: 'Thought leadership & lead gen' },
    { id: 'Instagram Reel', label: 'Instagram Reel / Story', desc: 'Short-form visual reel script' },
    { id: 'YouTube Video', label: 'YouTube Video / Short', desc: 'Hook, script & thumbnail prompt' },
    { id: 'TikTok', label: 'TikTok Short', desc: 'Viral hook & short video concept' },
    { id: 'Blog Article', label: 'Blog / SEO Article', desc: 'Long-form structured article' },
    { id: 'Newsletter', label: 'Email Newsletter', desc: 'High-open newsletter issue' },
    { id: 'Podcast Script', label: 'Podcast Script', desc: 'Talking points & host questions' },
    { id: 'Presentation', label: 'Slide Deck / Pitch', desc: 'Slide-by-slide layout & copy' },
    { id: 'Advertisement', label: 'Social Ad Copy', desc: 'High-converting ad variations' },
    { id: 'Landing Page', label: 'Landing Page Copy', desc: 'Hero section, features, & CTAs' },
    { id: 'Custom Format', label: 'Custom Format', desc: 'Define custom prompt parameters' },
  ];

  const goals = [
    { id: 'Lead Generation', label: 'Lead Generation', desc: 'Drive high-quality form fills & trial signups' },
    { id: 'Sales & Conversions', label: 'Sales & Conversions', desc: 'Direct revenue & product adoption' },
    { id: 'Brand Awareness', label: 'Brand Awareness', desc: 'Maximize viral impressions & brand authority' },
    { id: 'Education & Community', label: 'Education & Community', desc: 'Value-first tips & customer retention' },
    { id: 'Recruitment', label: 'Recruitment & Talent', desc: 'Attract top talent & company culture' },
    { id: 'Product Launch', label: 'Product Launch', desc: 'Feature announcements & updates' },
  ];

  const aiProviders = [
    { id: 'Gemini 3.6 Flash', label: 'Gemini 3.6 Flash (Recommended)', badge: 'Server Native', desc: 'Lightning fast multi-modal engine' },
    { id: 'OpenAI GPT-4o', label: 'OpenAI GPT-4o', badge: 'Popular', desc: 'High accuracy structured formatting' },
    { id: 'Claude 3.5 Sonnet', label: 'Claude 3.5 Sonnet', badge: 'Editorial', desc: 'Nuanced long-form copywriter' },
    { id: 'Auto-Select AI Engine', label: 'Auto-Select AI Engine', badge: 'Smart', desc: 'Lumora automatically selects best model' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStep(6);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardState),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOutput(json.data);
      }
    } catch {
      // Fallback response
      setOutput({
        id: 'out-1',
        contentType: wizardState.contentType,
        headline: `🚀 Why ${wizardState.topic || 'AI Content Operating Systems'} are mandatory for ${brandBrain.businessName} in 2026`,
        body: `Traditional marketing workflows were built for an era of manual content creation.\n\nAt ${brandBrain.businessName}, we realized that scaling content requires an integrated Brand Memory.\n\n3 key transformations we unlocked:\n1. Zero-Prompt Creation: Pre-configured Brand Brain tone eliminates generic AI responses.\n2. Multi-Channel Orchestration: Generate LinkedIn posts, video scripts, and email newsletters simultaneously.\n3. Autonomous AI Agents: Research, drafting, and publishing happen continuously.\n\nHow is your team scaling content this quarter?`,
        hashtags: ['#LumoraAI', '#ContentOS', '#Productivity', '#B2BSaaS', '#AI2026'],
        cta: brandBrain.primaryCTA || 'Start 14-Day Free Trial at acmetech.io',
        imagePromptSuggestions: [
          '3D sleek glassmorphism dashboard with blue neon nodes and high-tech typography',
          'Modern tech workspace with glowing hologram interface showing analytics trends',
        ],
        suggestedPlatforms: ['LinkedIn', 'Twitter/X', 'YouTube Shorts', 'Newsletter'],
        estimatedReachScore: 95,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    const textToCopy = `${output.headline}\n\n${output.body}\n\n${output.hashtags.join(' ')}\n\n${output.cta}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Wizard Step Progress Tracker */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between overflow-x-auto custom-scroll">
        {[1, 2, 3, 4, 5, 6].map((s) => {
          const stepLabels = ['Content Type', 'Goal', 'Audience', 'Brand Memory', 'AI Provider', 'Generate'];
          const isActive = step === s;
          const isDone = step > s;
          return (
            <div
              key={s}
              onClick={() => s < step && setStep(s)}
              className={`flex items-center gap-2 cursor-pointer whitespace-nowrap px-2 py-1 rounded-lg transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : isDone
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 opacity-60'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className="text-xs">{stepLabels[s - 1]}</span>
              {s < 6 && <span className="text-slate-300 dark:text-slate-700 mx-1">›</span>}
            </div>
          );
        })}
      </div>

      {/* STEP 1: Choose Content Type */}
      {step === 1 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Step 1: Select Content Type
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choose the format you want Lumora to orchestrate. No long prompt typing needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contentTypes.map((type) => {
              const selected = wizardState.contentType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => setWizardState({ ...wizardState, contentType: type.id })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selected
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{type.label}</h3>
                      {selected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{type.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">Selected: <strong className="text-slate-900 dark:text-white">{wizardState.contentType}</strong></span>
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: Define Goal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Goal */}
      {step === 2 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Step 2: Define Content Goal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              What objective should the AI optimize hooks, call-to-actions, and structure for?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((g) => {
              const selected = wizardState.goal === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => setWizardState({ ...wizardState, goal: g.id })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selected
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{g.label}</h3>
                      {selected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{g.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: Target Audience <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Target Audience */}
      {step === 3 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Step 3: Target Audience & Topic Focus
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Who are we writing for, and what specific topic should we focus on?
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Target Audience Persona
              </label>
              <input
                type="text"
                value={wizardState.audience}
                onChange={(e) => setWizardState({ ...wizardState, audience: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                placeholder="e.g., Tech Founders, Product Managers, CTOs at 50-2000 employee tech firms"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Topic / Concept Keyword
              </label>
              <input
                type="text"
                value={wizardState.topic}
                onChange={(e) => setWizardState({ ...wizardState, topic: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                placeholder="e.g., How AI Agents replace static SaaS automation in 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Additional Instructions (Optional)
              </label>
              <textarea
                rows={3}
                value={wizardState.customPrompt}
                onChange={(e) => setWizardState({ ...wizardState, customPrompt: e.target.value })}
                className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                placeholder="Include 3 key stats, keep paragraphs short, end with a question..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: Brand Context <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Brand Context (Brand Brain) */}
      {step === 4 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Step 4: Connect Brand Brain Memory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Lumora automatically injects your Brand Memory (tone, products, mission, CTAs) into this generation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Active Brand: {brandBrain.businessName}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('brand-brain')}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Edit Brand Brain →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Industry</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{brandBrain.industry}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Primary CTA</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{brandBrain.primaryCTA}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tone of Voice Pillars</span>
              <div className="flex flex-wrap gap-1.5">
                {brandBrain.toneOfVoice.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              Next: Select AI Provider <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Select AI Provider */}
      {step === 5 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Step 5: Select AI Model Provider
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your preferred underlying AI engine or let Lumora auto-route for optimal performance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiProviders.map((p) => {
              const selected = wizardState.aiProvider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setWizardState({ ...wizardState, aiProvider: p.id })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selected
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">{p.label}</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleGenerate}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Generate Content Now
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: AI Generation Output Screen */}
      {step === 6 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {isGenerating ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 animate-spin">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lumora Engine Orchestrating Content...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Applying Brand Brain memory ({brandBrain.businessName}), optimizing for {wizardState.goal}, and structuring multi-platform hooks.
              </p>
            </div>
          ) : output ? (
            <div className="space-y-6">
              {/* Output Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {output.contentType}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                      Est. Reach Score: {output.estimatedReachScore}/100
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Generated Content Output
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Copy'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onSaveToCalendar({
                        title: output.headline,
                        platform: 'LinkedIn',
                        contentType: output.contentType,
                        previewText: output.body,
                      });
                      onNavigate('calendar');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    Schedule to Calendar
                  </button>
                </div>
              </div>

              {/* Main Content Display Box */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {output.headline}
                </h3>

                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {output.body}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  {output.hashtags.map((tag, idx) => (
                    <span key={idx} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 text-xs font-semibold">
                  Primary CTA: {output.cta}
                </div>
              </div>

              {/* Suggested Image / Thumbnail Prompts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  AI Image & Thumbnail Prompts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {output.imagePromptSuggestions.map((prompt, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                      <p className="line-clamp-2">"{prompt}"</p>
                      <button
                        onClick={() => onNavigate('image-studio')}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Open in Image Studio →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Re-run Wizard Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Create Another Piece
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
