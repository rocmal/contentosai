import type { ReactNode } from 'react';

/** A scheduled/published post, joined from api.PublishingJob + api.ContentItem
 * (same join ContentCalendarView performs) and reshaped for the mobile
 * queue/calendar screens. `status` is mapped 1:1 from PublishingJob['status']
 * - no 'Draft'/'Review' states exist server-side yet, so the mobile UI only
 * shows what the backend actually tracks. */
export interface MobilePost {
  id: string;
  platform: string;
  title: string;
  time: string;
  dateKey: string;
  status: 'scheduled' | 'published' | 'failed';
  permalink: string | null;
}

export type MobileTab = 'home' | 'calendar' | 'studio' | 'profile';
export type StudioTab = 'video' | 'image' | 'voice' | 'character';
export type CreateScreen = 'wizard' | 'capture' | 'voice' | 'upload' | null;

export interface OnboardSlide {
  title: string;
  body: string;
  icon: ReactNode;
  iconBg: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  unread: boolean;
  icon: ReactNode;
  iconBg: string;
}

export interface RecentGeneration {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'VOICE';
  title: string;
  time: string;
}

export interface PastStudioProject {
  id: string;
  title: string;
  duration: string;
  status: 'Published' | 'Draft' | 'Review';
}
