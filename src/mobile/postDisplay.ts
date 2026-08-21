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

/** Studio "past projects" status pill - a separate small set (Published/
 * Draft/Review) from MobilePost['status'] since these are local sample
 * projects, not real PublishingJob records (no "draft"/"review" state
 * exists server-side yet). Kept apart from statusClasses/statusLabel above
 * so real post statuses never get bent to fit unrelated fake states. */
export function studioStatusClasses(status: 'Published' | 'Draft' | 'Review'): string {
  const base = 'inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2.5 py-[3px] rounded-full uppercase';
  if (status === 'Published') return `${base} bg-emerald-50 text-emerald-600`;
  if (status === 'Review') return `${base} bg-blue-100 text-blue-700`;
  return `${base} bg-slate-200 text-slate-600`;
}
