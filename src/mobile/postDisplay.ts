import { MobilePost } from './types';

/** Matches ContentCalendarView's PLATFORM_LABEL - the four platforms the
 * backend actually publishes to (see api.SocialPlatform). Anything else
 * (e.g. a platform added server-side later) falls back to a capitalized
 * raw value instead of silently rendering blank. */
const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function statusLabel(status: MobilePost['status']): string {
  if (status === 'published') return 'Published';
  if (status === 'failed') return 'Failed';
  return 'Scheduled';
}

export function statusClasses(status: MobilePost['status']): string {
  const base = 'inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2.5 py-[3px] rounded-full uppercase';
  if (status === 'published') return `${base} bg-emerald-50 text-emerald-600`;
  if (status === 'failed') return `${base} bg-red-50 text-red-600`;
  return `${base} bg-blue-50 text-blue-700`;
}

export const platformTagClasses =
  'inline-flex items-center text-[10px] font-bold tracking-wide px-2.5 py-[3px] rounded-full uppercase bg-slate-200 text-slate-700';
