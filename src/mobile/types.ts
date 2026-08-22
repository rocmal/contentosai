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

// NotificationItem, RecentGeneration, and PastStudioProject used to live
// here for the mock data in mockMobileData.tsx. Notifications and
// generations are now typed directly off the API (api.AppNotification,
// api.MediaAsset) instead of a separate UI-only shape - see
// useMobileNotifications.ts and HomeTab.tsx. PastStudioProject had no real
// counterpart to migrate to (no video-project entity exists in apps/api
// yet) so it was dropped along with the mock "Past projects" list itself.
