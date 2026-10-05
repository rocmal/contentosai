import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
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
  Loader2,
  Megaphone,
  Share2,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { BrandBrain, Project, ViewType, WizardState } from '../../types';
import VoiceInputButton, { appendSpoken, spokenLanguageFor } from '../VoiceInputButton';
import {
  ApiError,
  listProjects,
  saveGeneratedContent,
  scheduleGeneratedContent,
  studioGenerate,
  StudioFormat,
  StudioLanguage,
  StudioProvider,
  StudioResult,
} from '../../lib/api';

interface AIStudioViewProps {
  brandBrain: BrandBrain;
  onNavigate: (view: ViewType) => void;
}

export const AIStudioView: React.FC<AIStudioViewProps> = ({
  brandBrain,
  onNavigate,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<StudioResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [savingToProject, setSavingToProject] = useState(false);
  const [savedToProject, setSavedToProject] = useState<string | null>(null);

  useEffect(() => {
    listProjects({ limit: 50 })
      .then((r) => setProjects(r.items.filter((p) => p.status !== 'archived')))
      .catch(() => setProjects([]));
  }, []);

  const [wizardState, setWizardState] = useState<WizardState>({
    contentType: 'reel',
    goal: 'Lead Generation',
    audience: brandBrain.targetAudience || '',
    language: 'english',
    aiProvider: 'auto',
    topic: '',
    customPrompt: '',
  });

  const contentTypes: { id: StudioFormat; label: string; desc: string }[] = [
    { id: 'reel', label: 'Reel / Short Video Script', desc: 'Scene-by-scene script with hook, voiceover & CTA' },
    { id: 'poster', label: 'Poster / Social Creative', desc: 'Short poster copy plus an image prompt' },
    { id: 'whatsapp', label: 'WhatsApp Message', desc: 'Short, personal, forwardable message' },
    { id: 'advisor_post', label: 'Advisor Trust Post', desc: 'Educational first-person post that builds trust' },
    { id: 'social_post', label: 'Social Media Post', desc: 'Facebook / LinkedIn / Instagram post' },
    { id: 'ad_copy', label: 'Ad Copy', desc: 'Three ad variations with headlines' },
    { id: 'blog_article', label: 'Blog / SEO Article', desc: 'Long-form structured article' },
    { id: 'newsletter', label: 'Email Newsletter', desc: 'Subject line and newsletter issue' },
    { id: 'custom', label: 'Custom Format', desc: 'Describe the format in your own words' },
  ];

  const languages: { id: StudioLanguage; label: string }[] = [
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'Hindi (हिन्दी)' },
    { id: 'hinglish', label: 'Hinglish' },
    { id: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
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
    { id: 'auto', label: 'Auto (server default)', badge: 'Recommended', desc: 'Uses the provider configured on the server' },
    { id: 'gemini', label: 'Google Gemini', badge: 'Fast', desc: 'Fast multi-modal engine' },
    { id: 'openai', label: 'OpenAI', badge: 'Popular', desc: 'High accuracy structured formatting' },
    { id: 'claude', label: 'Anthropic Claude', badge: 'Editorial', desc: 'Nuanced long-form copywriter' },
    { id: 'sarvam', label: 'Sarvam AI', badge: 'Indic', desc: 'Built for Hindi, Punjabi and other Indian languages' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setOutput(null);
    setStep(6);

    try {
      const result = await studioGenerate({
        format: wizardState.contentType as StudioFormat,
        topic: wizardState.topic,
        goal: wizardState.goal,
        audience: wizardState.audience || undefined,
        customPrompt: wizardState.customPrompt || undefined,
        language: wizardState.language as StudioLanguage,
        provider: wizardState.aiProvider === 'auto' ? undefined : (wizardState.aiProvider as StudioProvider),
      });
      setOutput(result);
    } catch (err) {
      setGenerateError(err instanceof ApiError || err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const fullText = (o: StudioResult) =>
    [o.headline, o.body, o.hashtags.join(' '), o.cta, o.footer].filter(Boolean).join('\n\n');

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(fullText(output));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToProject = async () => {
    if (!output || !projectId) return;
    setSavingToProject(true);
    setScheduleError(null);
    setSavedToProject(null);
    try {
      await saveGeneratedContent({
        title: output.headline,
        body: [output.body, output.hashtags.join(' '), output.cta, output.footer].filter(Boolean).join('\n\n'),
        contentType: wizardState.contentType,
        aiProvider: output.provider,
        projectId,
      });
      setSavedToProject(projects.find((p) => p.id === projectId)?.title ?? 'project');
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to save to project');
    } finally {
      setSavingToProject(false);
    }
  };

  const handleScheduleToCalendar = async () => {
    if (!output) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      await scheduleGeneratedContent({
        title: output.headline,
        body: [output.body, output.hashtags.join(' '), output.cta, output.footer].filter(Boolean).join('\n\n'),
        contentType: wizardState.contentType,
        aiProvider: output.provider,
        projectId: projectId || undefined,
      });
      onNavigate('calendar');
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to schedule content');
    } finally {
      setScheduling(false);
    }
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
                placeholder="Leave as-is to use your Brand Brain audience"
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
                placeholder="e.g., Why young parents should plan for their child's education early"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Language
              </label>
              <select
                value={wizardState.language}
                onChange={(e) => setWizardState({ ...wizardState, language: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Additional Instructions (Optional)
                </label>
                <VoiceInputButton
                  language={spokenLanguageFor(wizardState.language)}
                  onText={(spoken) =>
                    setWizardState((prev) => ({ ...prev, customPrompt: appendSpoken(prev.customPrompt, spoken) }))
                  }
                />
              </div>
              <textarea
                rows={3}
                value={wizardState.customPrompt}
                onChange={(e) => setWizardState({ ...wizardState, customPrompt: e.target.value })}
                className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                placeholder="Add verified facts to use (product name, figures) or style notes. Anything not given here will not be invented."
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
              disabled={!wizardState.topic.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
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

          {!brandBrain.id && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <p className="font-bold">You haven't set up your Brand Brain yet.</p>
              <p>
                Content will still generate, but it won't use your voice, audience or content rules. Setting it up takes a
                couple of minutes - you can start from an industry pack or import from your website.
              </p>
              <button
                onClick={() => onNavigate('brand-brain')}
                className="font-semibold underline"
              >
                Set up Brand Brain →
              </button>
            </div>
          )}

          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${brandBrain.id ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Active Brand: {brandBrain.businessName || 'Not set up'}
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
                Applying Brand Brain memory ({brandBrain.businessName || 'no brand set up yet'}), optimizing for {wizardState.goal}, and structuring multi-platform hooks.
              </p>
            </div>
          ) : output ? (
            <div className="space-y-6">
              {/* Output Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {contentTypes.find((t) => t.id === wizardState.contentType)?.label ?? wizardState.contentType}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {output.provider} / {output.model}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Generated Content Output
                  </h2>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied!' : 'Copy Copy'}</span>
                    </button>

                    <button
                      onClick={handleScheduleToCalendar}
                      disabled={scheduling}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {scheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{scheduling ? 'Scheduling...' : 'Schedule to Calendar'}</span>
                    </button>
                  </div>
                  {scheduleError && (
                    <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                      <AlertCircle className="w-3 h-3" /> {scheduleError}
                    </span>
                  )}
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

                {output.footer && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    {output.footer}
                  </div>
                )}
              </div>

              {/* Save to project */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Project</span>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setSavedToProject(null);
                  }}
                  aria-label="Project to save this content to"
                  className="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveToProject}
                  disabled={!projectId || savingToProject}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5"
                >
                  {savingToProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingToProject ? 'Saving...' : 'Save draft to project'}
                </button>
                {savedToProject && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Saved to "{savedToProject}"
                  </span>
                )}
                {projects.length === 0 && (
                  <button
                    onClick={() => onNavigate('projects')}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Create a project first
                  </button>
                )}
              </div>

              {/* Compliance check */}
              {output.compliance.regulated && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    output.compliance.flags.length === 0
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                      : output.compliance.flags.some((f) => f.severity === 'block')
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <p className="font-bold">
                    {output.compliance.flags.length === 0
                      ? 'Automated compliance check passed. Still get this reviewed and approved before publishing.'
                      : output.compliance.flags.some((f) => f.severity === 'block')
                      ? 'Do not publish: this draft contains claims your compliance rules prohibit.'
                      : 'Review before publishing:'}
                  </p>
                  {output.compliance.flags.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1">
                      {output.compliance.flags.map((f, i) => (
                        <li key={i}>
                          {f.message} <span className="font-mono opacity-80">({f.match})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Visual direction */}
              {output.visualPrompt && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Visual Direction / Image Prompt</h4>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                    <p>"{output.visualPrompt}"</p>
                    <button
                      onClick={() => onNavigate('image-studio')}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Open in Image Studio →
                    </button>
                  </div>
                </div>
              )}

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
          ) : (
            <div className="py-12 text-center space-y-4">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Couldn't generate content</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {generateError ?? 'Something went wrong. Please try again.'} No credits are charged for a failed generation.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setStep(5)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
