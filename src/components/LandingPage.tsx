import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  Brain,
  Calendar,
  Check,
  Image,
  Mic,
  UserRound,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo, Wordmark } from './Logo';
import { ContactSalesModal } from './ContactSalesModal';
import { PRICING_PLANS, formatPlanPrice, BillingCycle, LocalizedRate } from '../lib/pricingPlans';
import { detectLikelyCurrency } from '../lib/currency';
import { fetchExchangeRate, PurchasablePlan } from '../lib/api';

interface LandingPageProps {
  onLoginClick: () => void;
  /** `plan` is set only when the click came from a Starter/Pro pricing card -
   * App.tsx carries it through signup so the new account lands straight on
   * Billing with checkout already open, instead of a bare dashboard. */
  onSignupClick: (plan?: PurchasablePlan) => void;
}

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

const FEATURES: { icon: LucideIcon; tint: 'blue' | 'indigo' | 'teal'; title: string; desc: string }[] = [
  { icon: Image, tint: 'blue', title: 'Image Studio', desc: 'Generate on-brand product shots, ad creatives, and social graphics in seconds, then upscale, remove backgrounds, or magic-resize for any platform.' },
  { icon: Mic, tint: 'indigo', title: 'Voice Studio', desc: 'Clone a voice once and generate narration in dozens of languages and tones, or pick from a library of studio-grade voices.' },
  { icon: UserRound, tint: 'teal', title: 'Character Studio', desc: 'Turn a single photo and a script into a talking avatar with accurate lip-sync. No camera, actor, or studio required.' },
  { icon: Video, tint: 'blue', title: 'Video Studio', desc: 'Script, storyboard, and edit video end-to-end with AI B-roll, auto captions, and voiceover in one timeline.' },
  { icon: Brain, tint: 'indigo', title: 'Brand Brain', desc: 'Teach the platform your brand once: voice, colors, tone, positioning. Every generation stays on-brand automatically.' },
  { icon: Bot, tint: 'teal', title: 'AI Agents & Automation', desc: 'Autonomous agents research topics, draft campaigns, repurpose one video into ten platform-ready clips, and publish on schedule.' },
  { icon: Calendar, tint: 'blue', title: 'Calendar & Publishing', desc: 'Plan, review, approve, and auto-publish across every connected channel from one shared calendar.' },
  { icon: BarChart3, tint: 'blue', title: 'Analytics', desc: 'Executive insights, engagement scores, and CTR across every channel, with AI-recommended strategy adjustments.' },
];

const TINT_CLASSES: Record<'blue' | 'indigo' | 'teal', { bg: string; border: string; stroke: string }> = {
  blue: { bg: 'bg-[#2563EB]/[0.14]', border: 'border-[#2563EB]/30', stroke: '#60A5FA' },
  indigo: { bg: 'bg-[#6366F1]/[0.14]', border: 'border-[#6366F1]/30', stroke: '#A5B4FC' },
  teal: { bg: 'bg-[#14B8A6]/[0.14]', border: 'border-[#14B8A6]/30', stroke: '#2DD4BF' },
};

const STEPS = [
  { n: '01', title: 'Set up Brand Brain', desc: 'Add your brand voice, colors, and audience once.' },
  { n: '02', title: 'Generate', desc: 'Create images, voice, video, or talking avatars from a prompt or script.' },
  { n: '03', title: 'Review & approve', desc: 'Your team reviews drafts together in one shared workspace.' },
  { n: '04', title: 'Publish everywhere', desc: 'Auto-schedule and publish across every connected channel.' },
];

const AI_MODELS = ['Gemini', 'GPT-4o', 'Claude', 'Flux / Stable Diffusion', 'ElevenLabs'];
const PUBLISH_CHANNELS = ['LinkedIn', 'YouTube', 'Twitter / X', 'Instagram', 'Slack', 'WordPress'];

const COMPARISON_ROWS = [
  { bad: '5+ separate subscriptions to manage', good: 'One platform, one bill' },
  { bad: 'Brand guidelines re-explained in every tool', good: 'Brand Brain enforces it automatically' },
  { bad: 'Separate editors for image, voice & video', good: 'One unified studio' },
  { bad: 'Manual scheduling across every channel', good: 'Auto-publish everywhere from one calendar' },
  { bad: 'Generic, off-brand AI output', good: 'Generation trained on your brand' },
];

const ABOUT_PILLARS = [
  { border: 'border-[#2563EB]', title: 'Speed', desc: 'Minutes from brief to a full set of ready-to-publish assets.' },
  { border: 'border-[#6366F1]', title: 'Brand consistency', desc: 'Every output checked against the same brand memory, every time.' },
  { border: 'border-[#14B8A6]', title: 'Scale', desc: 'One campaign becomes ten assets across every channel you publish to.' },
];

const FAQ_ITEMS = [
  { q: 'What are AI credits and how do they work?', a: 'Credits are the platform’s single unit of usage across every studio. Generating an image, a minute of voice, or a video clip each consumes a different number of credits depending on the model and resolution. Unused credits do not roll over.' },
  { q: 'Can I clone my own voice or use my own likeness for talking avatars?', a: 'Yes. Voice cloning and Character Studio avatars are built from media you upload, and you must have the right to use that voice or likeness. We require consent confirmation before any clone or avatar is generated.' },
  { q: 'Which platforms can I publish to directly?', a: 'LumoraOS publishes to LinkedIn, YouTube, Twitter/X, Instagram, and WordPress, with Slack notifications for team approvals. More channels are added over time.' },
  { q: 'Can I switch or cancel my plan anytime?', a: 'Yes. You can upgrade, downgrade, or cancel from Billing at any time. Changes apply at the start of your next billing cycle.' },
  { q: 'Who owns the content I generate?', a: 'You own the rights to content generated from your account, subject to the usage terms of the underlying AI providers for any third-party training data restrictions.' },
  { q: 'Do you offer a free trial?', a: 'Yes, every new workspace starts with a free trial period on the Starter plan so you can test Image, Voice, and Video Studio before adding a payment method.' },
];

const SALES_EMAIL = 'mailto:sales@lumoraos.in';

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-[18px] py-2 rounded-full text-[13px] font-semibold transition-colors ${
        active ? 'bg-gradient-to-br from-[#2563EB] to-[#6366F1] text-white' : 'bg-transparent text-[#94A3B8]'
      }`}
    >
      {children}
    </button>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSignupClick }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [faqOpen, setFaqOpen] = useState<number>(-1);
  const [localizedRate, setLocalizedRate] = useState<LocalizedRate | null>(null);
  const [salesModalOpen, setSalesModalOpen] = useState(false);

  useEffect(() => {
    const currency = detectLikelyCurrency();
    if (currency === 'USD') return;
    fetchExchangeRate(currency).then((rate) => {
      if (rate.currency !== 'USD') setLocalizedRate(rate);
    });
  }, []);

  return (
    <div className="bg-[#0B1120] text-[#F8FAFC] min-h-screen overflow-x-hidden font-['Inter',system-ui,-apple-system,sans-serif] antialiased">
      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-[10px] bg-[#0B1120]/80 border-b border-white/[0.08]">
        <div className="max-w-[1180px] mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <a href="#" className="flex items-center gap-2.5">
            <Logo size={32} />
            <Wordmark className="text-[19px] font-extrabold text-[#F8FAFC] tracking-[-0.01em]" />
          </a>
          <nav className="flex items-center gap-7 flex-wrap">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-[#CBD5E1] hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={onLoginClick} className="text-sm font-semibold text-[#F8FAFC] px-4 py-[9px] whitespace-nowrap shrink-0">
              Log in
            </button>
            <button
              onClick={() => onSignupClick()}
              className="text-sm font-bold text-white px-5 py-2.5 rounded-[10px] bg-gradient-to-br from-[#2563EB] to-[#6366F1] shadow-[0_4px_14px_rgba(37,99,235,0.35)] whitespace-nowrap shrink-0"
            >
              Start free trial
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-[100px] pb-20 px-6 overflow-hidden">
        <div className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(circle,rgba(37,99,235,0.28),transparent_70%)] blur-[40px] pointer-events-none" />
        <div className="max-w-[900px] mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6366F1]/[0.12] border border-[#6366F1]/30 text-xs font-bold tracking-[0.04em] text-[#A5B4FC] mb-6">
            AI CONTENT OPERATING SYSTEM
          </div>
          <h1 className="text-[clamp(36px,5.2vw,64px)] font-extrabold leading-[1.08] tracking-[-0.02em] mb-5 text-[#F8FAFC]">
            One platform for every piece of content your brand needs.
          </h1>
          <p className="text-[clamp(16px,1.6vw,19px)] leading-relaxed text-[#94A3B8] max-w-[640px] mx-auto mb-9">
            Generate on-brand images, clone voices, sync lifelike talking avatars, and produce full videos, then plan and publish everywhere. All from one brand-aware platform.
          </p>
          <div className="flex justify-center gap-3.5 flex-wrap mb-4">
            <button
              onClick={() => onSignupClick()}
              className="text-[15px] font-bold text-white px-7 py-3.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6366F1] shadow-[0_8px_24px_rgba(37,99,235,0.4)] whitespace-nowrap shrink-0"
            >
              Start free trial
            </button>
            <a
              href="#pricing"
              className="text-[15px] font-semibold text-[#F8FAFC] px-7 py-3.5 rounded-xl border border-white/[0.16] whitespace-nowrap shrink-0"
            >
              See pricing
            </a>
          </div>
          <p className="text-[13px] text-[#64748B]">Cancel anytime. No setup fees.</p>
        </div>

        <div className="max-w-[1000px] mx-auto mt-14 relative">
          <video
            src="/videos/lumora-brand-ad.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video object-cover block rounded-[20px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] bg-black"
          />
        </div>
      </section>

      {/* NAME MEANING */}
      <section className="pb-16 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">THE NAME</div>
          <p className="text-[17px] leading-[1.7] text-[#CBD5E1]">
            Lumora blends <em className="text-[#F8FAFC] not-italic font-semibold">lumen</em>, the unit of light, with{' '}
            <em className="text-[#F8FAFC] not-italic font-semibold">aura</em>, the presence a brand builds around itself. The name reflects the job the platform does: giving every piece of content the same brand light, consistently, at scale.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 bg-[#0F172A] border-y border-white/[0.06]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-14">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">PLATFORM</div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] mb-3.5 text-[#F8FAFC]">
              Everything your content team needs, in one place.
            </h2>
            <p className="text-base text-[#94A3B8]">Seven AI studios, one shared brand memory.</p>
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const tint = TINT_CLASSES[f.tint];
              return (
                <div key={f.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7">
                  <div className={`w-11 h-11 rounded-xl ${tint.bg} border ${tint.border} flex items-center justify-center mb-4.5`}>
                    <Icon className="w-[22px] h-[22px]" style={{ color: tint.stroke }} strokeWidth={1.6} />
                  </div>
                  <h3 className="text-[17px] font-bold mb-2 text-[#F8FAFC]">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-[#94A3B8]">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-14">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">WORKFLOW</div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] mb-3.5 text-[#F8FAFC]">
              From brief to published, in four steps.
            </h2>
          </div>
          <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="text-[32px] font-extrabold text-[#60A5FA]/35 mb-2.5">{s.n}</div>
                <h3 className="text-base font-bold mb-2 text-[#F8FAFC]">{s.title}</h3>
                <p className="text-sm leading-relaxed text-[#94A3B8]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO VIDEO */}
      <section className="py-20 px-6">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">DEMO</div>
          <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] mb-8 text-[#F8FAFC]">
            See LumoraOS in action.
          </h2>
          <video
            src="/videos/lumora-tutorial.mp4"
            controls
            className="w-full block rounded-[20px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] bg-black"
          />
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="py-20 px-6 bg-[#0F172A] border-y border-white/[0.06]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-11">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">UNDER THE HOOD</div>
            <h2 className="text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.01em] text-[#F8FAFC]">
              Built on leading AI models. Publishes everywhere your audience is.
            </h2>
          </div>
          <div className="flex flex-col gap-5 items-center">
            <div className="flex flex-wrap gap-2.5 justify-center">
              {AI_MODELS.map((m) => (
                <span key={m} className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-[13px] text-[#CBD5E1]">
                  {m}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {PUBLISH_CHANNELS.map((c) => (
                <span key={c} className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-[13px] text-[#CBD5E1]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 px-6">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center max-w-[600px] mx-auto mb-12">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">WHY LUMORAOS</div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] text-[#F8FAFC]">
              Replace five tools with one.
            </h2>
          </div>
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            <div className="grid grid-cols-2 bg-white/[0.03]">
              <div className="px-6 py-4 text-[13px] font-bold text-[#64748B] border-r border-white/[0.08]">FRAGMENTED TOOLS</div>
              <div className="px-6 py-4 text-[13px] font-bold text-[#818CF8]">LUMORAOS</div>
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className="grid grid-cols-2 border-t border-white/[0.08]">
                <div className="px-6 py-[18px] flex gap-2.5 items-start border-r border-white/[0.08]">
                  <X className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" strokeWidth={2} />
                  <span className="text-sm text-[#94A3B8]">{row.bad}</span>
                </div>
                <div className="px-6 py-[18px] flex gap-2.5 items-start">
                  <Check className="w-4 h-4 text-[#34D399] mt-0.5 shrink-0" strokeWidth={2.2} />
                  <span className="text-sm text-[#E2E8F0]">{row.good}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6 bg-[#0F172A] border-y border-white/[0.06]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center max-w-[640px] mx-auto mb-8">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">PRICING</div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] mb-3.5 text-[#F8FAFC]">
              Simple plans that scale with your content output.
            </h2>
            <p className="text-base text-[#94A3B8]">Every plan includes Brand Brain, so generations always stay on-brand.</p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1 gap-0.5">
              <PillButton active={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
                Monthly
              </PillButton>
              <PillButton active={billingCycle === 'annual'} onClick={() => setBillingCycle('annual')}>
                Annual · save ~20%
              </PillButton>
            </div>
          </div>

          <div className="grid gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            {PRICING_PLANS.map((plan) => {
              const { priceDisplay, periodLabel, ctaLabel } = formatPlanPrice(plan, billingCycle, localizedRate ?? undefined);
              const isEnterprise = plan.priceMonthly == null;
              return (
                <div
                  key={plan.key}
                  className="relative bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-8 flex flex-col gap-5"
                >
                  {plan.popular && (
                    <>
                      <div className="absolute -inset-px rounded-[20px] border-2 border-[#2563EB] pointer-events-none" />
                      <div className="absolute -top-3 left-8 bg-gradient-to-br from-[#2563EB] to-[#6366F1] text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-[0.02em]">
                        MOST POPULAR
                      </div>
                    </>
                  )}
                  <div>
                    <h3 className="text-[19px] font-extrabold mb-1.5 text-[#F8FAFC]">{plan.name}</h3>
                    <p className="text-[13px] text-[#94A3B8] min-h-9">{plan.tagline}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[38px] font-extrabold text-[#F8FAFC]">{priceDisplay}</span>
                    <span className="text-[13px] text-[#94A3B8]">{periodLabel}</span>
                  </div>
                  <p className="text-[13px] text-[#818CF8] font-semibold">
                    {plan.credits} · {plan.seats}
                  </p>
                  <a
                    href={isEnterprise ? '#' : undefined}
                    onClick={
                      isEnterprise
                        ? (e) => {
                            e.preventDefault();
                            setSalesModalOpen(true);
                          }
                        : () => onSignupClick(plan.key as PurchasablePlan)
                    }
                    className="text-center w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-br from-[#2563EB] to-[#6366F1] whitespace-nowrap cursor-pointer"
                  >
                    {ctaLabel}
                  </a>
                  <div className="flex flex-col gap-2.5 mt-1">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex gap-2 items-start">
                        <Check className="w-[15px] h-[15px] text-[#34D399] mt-0.5 shrink-0" strokeWidth={2.2} />
                        <span className="text-[13px] leading-relaxed text-[#CBD5E1]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[12.5px] text-[#64748B] max-w-[560px] mx-auto mt-10">
            1 credit ≈ 1 image, ~1 minute of AI voice, or ~10 seconds of video. Actual usage varies by model and output resolution.
            {localizedRate && (
              <>
                {' '}Prices shown in {localizedRate.currency} are an approximate conversion - you're charged in INR at checkout.
              </>
            )}
          </p>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-20 px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-[640px] mb-12">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">ABOUT</div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] mb-4 text-[#F8FAFC]">
              Built for teams that publish content every day.
            </h2>
            <p className="text-base leading-relaxed text-[#94A3B8]">
              LumoraOS started as an answer to a simple problem: content teams were stitching together a dozen point tools to write, design, voice, and ship a single campaign. We built one platform that remembers your brand and produces every format from it.
            </p>
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            {ABOUT_PILLARS.map((p) => (
              <div key={p.title} className={`border-t-2 ${p.border} pt-5`}>
                <h3 className="text-base font-bold mb-2 text-[#F8FAFC]">{p.title}</h3>
                <p className="text-sm leading-relaxed text-[#94A3B8]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-[#0F172A] border-t border-white/[0.06]">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-bold tracking-[0.06em] text-[#818CF8] mb-3">FAQ</div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-[-0.01em] text-[#F8FAFC]">
              Frequently asked questions.
            </h2>
          </div>
          {FAQ_ITEMS.map((item, i) => {
            const open = faqOpen === i;
            return (
              <div key={item.q} className="border-b border-white/[0.08]">
                <button
                  onClick={() => setFaqOpen(open ? -1 : i)}
                  className="w-full flex justify-between items-center gap-4 py-5 px-1 bg-transparent border-none text-left text-[#F8FAFC] text-base font-semibold"
                >
                  <span>{item.q}</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {open && (
                  <div className="pb-5 px-1 max-w-[680px]">
                    <p className="text-[#94A3B8] text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6">
        <div className="max-w-[900px] mx-auto rounded-3xl bg-gradient-to-br from-[#1e3a8a] to-[#312e81] p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[280px] h-[280px] bg-[radial-gradient(circle,rgba(20,184,166,0.25),transparent_70%)] pointer-events-none" />
          <h2 className="text-[clamp(26px,3.2vw,38px)] font-extrabold tracking-[-0.01em] mb-4 text-white relative">
            Ready to produce content at the speed of your ideas?
          </h2>
          <p className="text-base text-[#C7D2FE] mb-8 relative">
            Start free, no credit card lock-in required to explore the platform.
          </p>
          <div className="flex justify-center gap-3.5 flex-wrap relative">
            <button
              onClick={() => onSignupClick()}
              className="text-[15px] font-bold text-[#1e293b] px-7 py-3.5 rounded-xl bg-white whitespace-nowrap shrink-0"
            >
              Start free trial
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setSalesModalOpen(true);
              }}
              className="text-[15px] font-semibold text-white px-7 py-3.5 rounded-xl border border-white/[0.35] whitespace-nowrap shrink-0"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-14 pb-8 px-6 border-t border-white/[0.08]">
        <div className="max-w-[1180px] mx-auto">
          <div className="grid gap-8 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
            <div>
              <a href="#" className="flex items-center gap-2.5 mb-3">
                <Logo size={26} />
                <Wordmark className="text-base font-extrabold text-[#F8FAFC]" />
              </a>
              <p className="text-[13px] text-[#64748B] mb-1">The AI content operating system.</p>
              <p className="text-xs text-[#475569]">lumoraos.in</p>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-[0.05em] text-[#64748B] mb-3.5">PRODUCT</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#features" className="text-[13px] text-[#94A3B8] hover:text-white">Image Studio</a>
                <a href="#features" className="text-[13px] text-[#94A3B8] hover:text-white">Voice Studio</a>
                <a href="#features" className="text-[13px] text-[#94A3B8] hover:text-white">Character Studio</a>
                <a href="#features" className="text-[13px] text-[#94A3B8] hover:text-white">Video Studio</a>
                <a href="#pricing" className="text-[13px] text-[#94A3B8] hover:text-white">Pricing</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-[0.05em] text-[#64748B] mb-3.5">COMPANY</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-[13px] text-[#94A3B8] hover:text-white">About</a>
                <a href="#faq" className="text-[13px] text-[#94A3B8] hover:text-white">FAQ</a>
                <a href={SALES_EMAIL} className="text-[13px] text-[#94A3B8] hover:text-white">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-[0.05em] text-[#64748B] mb-3.5">LEGAL</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-[13px] text-[#94A3B8] hover:text-white">Privacy Policy</a>
                <a href="#" className="text-[13px] text-[#94A3B8] hover:text-white">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.08] pt-6">
            <p className="text-xs text-[#475569]">© 2026 LumoraOS. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <ContactSalesModal isOpen={salesModalOpen} onClose={() => setSalesModalOpen(false)} />
    </div>
  );
};
