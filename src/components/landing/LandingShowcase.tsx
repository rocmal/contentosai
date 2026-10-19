import React from 'react';
import { CalendarClock, Image as ImageIcon, Mic, Play, Sparkles, Video } from 'lucide-react';
import { AuroraBackdrop, SparkMark, Waveform } from '../auth/LoginArt';

/**
 * The landing page's hero picture: a mock Lumora window showing what the product does today - one prompt, images
 * sized for each platform, a vertical Veo clip, a Hindi voiceover and scheduled posts. It is drawn in code instead
 * of a recorded video so it cannot drift from the product the way the old brand video did (it advertised AI agents
 * and a wizard that were never sold). Keep every card to a feature that exists.
 */

const glass = 'rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl';

const PALETTES = {
  dawn: ['#f59e0b', '#ec4899', '#6366f1', '#312e81', '#1e1b4b'],
  lake: ['#38bdf8', '#2563eb', '#4f46e5', '#1e3a8a', '#172554'],
  rose: ['#fb7185', '#c026d3', '#7c3aed', '#4c1d95', '#2e1065'],
} as const;

/** A small sunrise-over-hills artwork standing in for a generated image. */
const Artwork: React.FC<{ palette: keyof typeof PALETTES }> = ({ palette }) => {
  const [top, mid, bottom, hill, front] = PALETTES[palette];
  const id = `lumora-art-${palette}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      <circle cx="66" cy="44" r="13" fill="#fde68a" opacity="0.9" />
      <path d="M0 72 L22 52 L42 68 L62 48 L100 76 L100 100 L0 100 Z" fill={hill} opacity="0.85" />
      <path d="M0 86 L30 68 L56 84 L82 66 L100 80 L100 100 L0 100 Z" fill={front} />
    </svg>
  );
};

/** `ratio` is width / height. */
const POSTERS: { label: string; size: string; ratio: number; palette: keyof typeof PALETTES }[] = [
  { label: 'Instagram', size: '1080×1350', ratio: 1080 / 1350, palette: 'dawn' },
  { label: 'Facebook', size: '1200×630', ratio: 1200 / 630, palette: 'lake' },
  { label: 'WhatsApp', size: '1080×1920', ratio: 1080 / 1920, palette: 'rose' },
];

const SCHEDULED: { when: string; platform: string; dot: string }[] = [
  { when: 'Tomorrow, 9:00 AM', platform: 'Facebook', dot: 'bg-blue-400' },
  { when: 'Fri, 6:30 PM', platform: 'Instagram', dot: 'bg-pink-400' },
  { when: 'Mon, 10:00 AM', platform: 'YouTube', dot: 'bg-red-400' },
];

const CardTitle: React.FC<{ icon: React.ReactNode; title: string; note?: string }> = ({ icon, title, note }) => (
  <div className="flex items-center gap-2 mb-3">
    {icon}
    <span className="text-[12px] font-bold text-white">{title}</span>
    {note && <span className="ml-auto text-[10px] font-semibold text-white/50">{note}</span>}
  </div>
);

export const LandingShowcase: React.FC = () => (
  <div
    role="img"
    aria-label="Lumora making an Instagram, Facebook and WhatsApp image from one prompt, a vertical video, a Hindi voiceover and three scheduled posts"
    className="relative rounded-[20px] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] text-left"
  >
    <AuroraBackdrop />
    <div aria-hidden className="relative">
      {/* Window bar */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10 bg-white/[0.03]">
        <div className="hidden sm:flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        </div>
        <SparkMark size={20} />
        <span className="text-[13px] font-bold text-white">Lumora</span>
        <div className="hidden md:flex items-center gap-1 ml-4 text-[11px] font-semibold text-white/55">
          {['Image Studio', 'Video Studio', 'Voice Studio', 'Gallery', 'Calendar'].map((t, i) => (
            <span key={t} className={`px-2.5 py-1 rounded-lg ${i === 0 ? 'bg-white/10 text-white' : ''}`}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* The prompt */}
        <div className={`${glass} flex items-center gap-3 px-4 py-3`}>
          <Sparkles className="w-4 h-4 text-violet-300 shrink-0" />
          <p className="text-[13px] sm:text-[14px] text-white/90 truncate">
            A happy Indian family planning their child's future, warm morning light
            <span className="lumora-caret inline-block w-[2px] h-[1.1em] align-[-0.2em] ml-0.5 bg-white/80" />
          </p>
          <span className="hidden sm:inline-flex items-center gap-1 ml-auto shrink-0 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/80">
            <Mic className="w-3 h-3" /> Speak
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-12 gap-4">
          {/* Image Studio: one prompt, the right size for each platform */}
          <div className={`${glass} col-span-2 md:col-span-5 p-4 flex flex-col`}>
            <CardTitle icon={<ImageIcon className="w-4 h-4 text-amber-300" />} title="Image Studio" note="3 sizes, 1 prompt" />
            {/* Each poster's share of the row is its width/height ratio, so all three come out the same height. */}
            <div className="my-auto flex items-start gap-3">
              {POSTERS.map((p) => (
                <div key={p.label} className="min-w-0 flex flex-col items-center gap-1.5" style={{ flex: `${p.ratio} 1 0` }}>
                  <div
                    className="relative w-full rounded-lg overflow-hidden ring-1 ring-white/15"
                    style={{ aspectRatio: p.ratio }}
                  >
                    <Artwork palette={p.palette} />
                  </div>
                  <span className="text-[10px] font-semibold text-white/80 leading-tight text-center">{p.label}</span>
                  <span className="text-[9px] text-white/45 tabular-nums -mt-1">{p.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Video Studio: a vertical Veo clip */}
          <div className={`${glass} col-span-1 md:col-span-3 p-4 flex flex-col`}>
            <CardTitle icon={<Video className="w-4 h-4 text-sky-300" />} title="Video Studio" />
            <div className="relative mx-auto h-[150px] sm:h-[176px] aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700 ring-1 ring-white/15">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_55%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 text-indigo-700 ml-0.5" fill="currentColor" />
                </div>
              </div>
              <div className="absolute left-2 right-2 bottom-2 h-1 rounded-full bg-white/25 overflow-hidden">
                <div className="lumora-progress h-full rounded-full bg-white" />
              </div>
            </div>
            <p className="mt-2.5 text-[10px] font-semibold text-white/75 text-center leading-snug">
              Vertical 9:16 · 8 s
              <br />
              <span className="text-white/45 font-medium">Reels, Shorts, Status</span>
            </p>
          </div>

          {/* Voice Studio and the calendar */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
            <div className={`${glass} p-4`}>
              <CardTitle icon={<Mic className="w-4 h-4 text-violet-300" />} title="Voice Studio" />
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {['हिंदी', 'ਪੰਜਾਬੀ', 'English'].map((l, i) => (
                  <span
                    key={l}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      i === 0 ? 'bg-violet-500/40 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </div>
              <Waveform animated className="h-7 overflow-hidden" />
              <p className="mt-2 text-[10px] text-white/50">Or record your own voice</p>
            </div>

            <div className={`${glass} p-4 hidden sm:block`}>
              <CardTitle icon={<CalendarClock className="w-4 h-4 text-emerald-300" />} title="Scheduled" />
              <ul className="space-y-2">
                {SCHEDULED.map((s) => (
                  <li key={s.when} className="flex items-center gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                    <span className="text-white/85 font-semibold truncate">{s.when}</span>
                    <span className="ml-auto text-white/50 shrink-0">{s.platform}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
