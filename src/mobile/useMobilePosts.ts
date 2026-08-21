import { useEffect, useState } from 'react';
import * as api from '../lib/api';
import { MobilePost } from './types';

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function postDate(job: api.PublishingJob): Date | null {
  const raw = job.status === 'published' ? job.publishedAt ?? job.scheduledAt : job.scheduledAt;
  return raw ? new Date(raw) : null;
}

/** Same join ContentCalendarView performs (PublishingJob + ContentItem via
 * contentId), reshaped into the flatter MobilePost the mobile screens want.
 * Shared here so Home's "Today's Queue" and the Calendar tab's day picker
 * fetch and join the data exactly once instead of duplicating the request. */
export function useMobilePosts(): { posts: MobilePost[]; loading: boolean; error: string | null } {
  const [posts, setPosts] = useState<MobilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jobs, content] = await Promise.all([api.listScheduledPosts(), api.listContent()]);
        if (cancelled) return;
        const contentById = new Map(content.map((c) => [c.id, c]));
        const joined: MobilePost[] = jobs
          .map((job) => {
            const d = postDate(job);
            const item = job.contentId ? contentById.get(job.contentId) ?? null : null;
            return {
              id: job.id,
              platform: job.platform,
              title: item?.title ?? 'Untitled post',
              time: d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—',
              dateKey: d ? dateKey(d) : '',
              status: job.status,
              permalink: job.permalink,
            };
          })
          .filter((p) => p.dateKey);
        setPosts(joined);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load scheduled content.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { posts, loading, error };
}

export interface WeekDay {
  key: string;
  label: string;
  date: number;
  isToday: boolean;
  full: string;
}

/** The Mon-Sun week containing today, used by both the Home "Today's Queue"
 * lookup and the Calendar tab's 7-day strip - real dates, not the design
 * reference's hardcoded Aug 17-23 placeholders. */
export function getCurrentWeek(): WeekDay[] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      key: dateKey(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: d.getDate(),
      isToday: dateKey(d) === dateKey(today),
      full: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    };
  });
}

export function todayKey(): string {
  return dateKey(new Date());
}
