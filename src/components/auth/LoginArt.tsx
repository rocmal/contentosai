import React, { useEffect, useId, useState } from 'react';
import { CalendarClock, Image as ImageIcon, Mic, Play } from 'lucide-react';

/**
 * Artwork for the sign-in screens: the Lumora spark mark, the dark aurora backdrop, floating studio
 * preview cards (desktop) and a short brand splash shown once per browser session on phones.
 * Everything is drawn with CSS/SVG so there are no image files to load or keep in step.
 */

/** The spark from design_handoff_mobile_app: four rounded bars at 0/45/90/135 degrees on a blue tile. */
export const SparkMark: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => {
  const tileId = `lumora-spark-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label="Lumora" className={className}>
      <defs>
        <linearGradient id={tileId} x1="0" y1="56" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="18" fill={`url(#${tileId})`} />
      {[0, 45, 90, 135].map((deg) => (
        <rect key={deg} x="26.25" y="16.25" width="3.5" height="23.5" rx="1.75" fill="#fff" transform={`rotate(${deg} 28 28)`} />
      ))}
    </svg>
  );
};

/** Dark navy field with soft colour glows and a faint dot grid. Fills its (relative) parent. */
export const AuroraBackdrop: React.FC = () => (
  <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#0a0f24]">
    <div className="lumora-aurora absolute -top-1/4 -left-1/4 w-[70%] aspect-square rounded-full bg-blue-600/40 blur-[110px]" />
    <div className="lumora-aurora lumora-aurora-slow absolute top-1/3 -right-1/4 w-[65%] aspect-square rounded-full bg-indigo-500/35 blur-[120px]" />
    <div className="lumora-aurora absolute -bottom-1/4 left-1/5 w-[55%] aspect-square rounded-full bg-fuchsia-500/20 blur-[120px]" />
    <div className="absolute bottom-[10%] right-[15%] w-[25%] aspect-square rounded-full bg-amber-400/10 blur-[90px]" />
    <div
      className="absolute inset-0 opacity-[0.18]"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0f24]/70" />
  </div>
);

const WAVE = [6, 14, 22, 12, 28, 18, 34, 20, 10, 26, 16, 30, 12, 22, 8, 18, 26, 14, 20, 10];

/** Small voice waveform; `animated` makes the bars breathe. */
export const Waveform: React.FC<{ className?: string; animated?: boolean }> = ({ className = '', animated = false }) => (
  <div aria-hidden className={`flex items-center gap-[3px] h-9 ${className}`}>
    {WAVE.map((h, i) => (
      <span
        key={i}
        className={`w-[3px] rounded-full bg-gradient-to-t from-blue-400 to-violet-300 ${animated ? 'lumora-wave' : ''}`}
        style={{ height: h, animationDelay: `${(i % 7) * 120}ms` }}
      />
    ))}
  </div>
);

const glass = 'rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40';

/** Floating previews of the three studios plus a scheduled-post chip (desktop panel only). */
export const StudioShowcase: React.FC = () => (
  <div aria-hidden className="relative w-full max-w-[460px] h-[340px] mx-auto">
    {/* Image Studio */}
    <div className={`lumora-float absolute left-0 top-2 w-[230px] p-2.5 ${glass}`}>
      <div className="relative h-[150px] rounded-xl overflow-hidden">
        <svg viewBox="0 0 230 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="lumora-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="0.55" stopColor="#ec4899" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect width="230" height="150" fill="url(#lumora-sky)" />
          <circle cx="160" cy="70" r="26" fill="#fde68a" opacity="0.9" />
          <path d="M0 110 L50 72 L95 104 L140 66 L230 118 L230 150 L0 150 Z" fill="#312e81" opacity="0.85" />
          <path d="M0 128 L70 100 L130 126 L190 98 L230 120 L230 150 L0 150 Z" fill="#1e1b4b" />
        </svg>
      </div>
      <div className="flex items-center gap-2 px-1 pt-2.5 pb-0.5">
        <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
        <span className="text-[11px] font-semibold text-white/85">Instagram post · 1080×1080</span>
      </div>
    </div>

    {/* Video Studio */}
    <div className={`lumora-float lumora-float-delay absolute right-0 top-14 w-[210px] p-2.5 ${glass}`}>
      <div className="relative h-[118px] rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-indigo-700 ml-0.5" fill="currentColor" />
          </div>
        </div>
        <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white/90 tabular-nums">0:08</span>
      </div>
      <div className="mt-2.5 h-1 rounded-full bg-white/15 overflow-hidden">
        <div className="lumora-progress h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400" />
      </div>
      <p className="text-[11px] font-semibold text-white/85 px-0.5 pt-2">Reel · 9:16 · Veo</p>
    </div>

    {/* Voice Studio */}
    <div className={`lumora-float lumora-float-slow absolute left-10 bottom-0 w-[250px] px-3.5 py-3 ${glass}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center">
          <Mic className="w-3.5 h-3.5 text-violet-200" />
        </div>
        <span className="text-[11px] font-semibold text-white/85">Voiceover · Hindi</span>
      </div>
      <Waveform animated />
    </div>

    {/* Calendar chip */}
    <div className={`lumora-float lumora-float-delay absolute right-4 bottom-10 flex items-center gap-2 px-3 py-2 ${glass} rounded-full`}>
      <CalendarClock className="w-3.5 h-3.5 text-emerald-300" />
      <span className="text-[11px] font-semibold text-white/85">Scheduled · Tomorrow 9:00</span>
    </div>
  </div>
);

const SPLASH_KEY = 'lumora.loginSplashSeen';

function shouldShowSplash(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia('(max-width: 1023px)').matches) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return window.sessionStorage.getItem(SPLASH_KEY) !== '1';
  } catch {
    return false;
  }
}

/**
 * Full-screen brand splash for phones and tablets: shown once per browser session, about 1.6 s, then
 * fades away to the sign-in form. Tapping skips it. Never shown on desktop or with reduced motion.
 */
export const LoginSplash: React.FC = () => {
  const [phase, setPhase] = useState<'show' | 'leave' | 'gone'>(() => (shouldShowSplash() ? 'show' : 'gone'));

  useEffect(() => {
    if (phase !== 'show') return;
    try {
      window.sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      // Private mode: the splash simply shows again next time.
    }
    const leave = window.setTimeout(() => setPhase('leave'), 1600);
    return () => window.clearTimeout(leave);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'leave') return;
    const gone = window.setTimeout(() => setPhase('gone'), 450);
    return () => window.clearTimeout(gone);
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      role="presentation"
      onClick={() => setPhase('leave')}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-[450ms] ${
        phase === 'leave' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <AuroraBackdrop />
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <div className="lumora-halo absolute inset-0 rounded-[28px] bg-blue-500/50 blur-2xl" />
          <SparkMark size={84} className="relative lumora-pop" />
        </div>
        <span className="lumora-rise mt-6 text-3xl font-bold tracking-tight text-white">Lumora</span>
        <span className="lumora-rise lumora-rise-delay mt-2 text-sm text-white/60">Images, videos and voice in minutes</span>
      </div>
      <div className="absolute bottom-14 w-24 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="lumora-load h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400" />
      </div>
    </div>
  );
};
