/** Lumora's users are in India and its servers run on UTC, so dates people read are shown in India time. */
export const INDIA_TIME_ZONE = 'Asia/Kolkata';

/** "19 Dec 2026" in India time. */
export function formatIndiaDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: INDIA_TIME_ZONE,
  });
}
