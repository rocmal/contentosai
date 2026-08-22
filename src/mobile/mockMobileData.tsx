import React from 'react';
import { Calendar, Sparkles, Video } from 'lucide-react';
import { OnboardSlide } from './types';

/** First-run carousel copy. Purely marketing/orientation content, not backed
 * by any API - shown once per device (see MobileApp's onboarding-seen flag). */
export const ONBOARD_SLIDES: OnboardSlide[] = [
  {
    title: 'Create content, anywhere',
    body: 'AI-powered video, image, and voice tools built for your brand — now in your pocket.',
    icon: <Sparkles className="w-10 h-10 text-blue-700" />,
    iconBg: 'bg-blue-50',
  },
  {
    title: 'One brand, every platform',
    body: 'Your Brand Brain keeps voice and visuals consistent across every studio and channel.',
    icon: <Video className="w-10 h-10 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
  },
  {
    title: 'Plan, schedule, capture on the go',
    body: 'Queue posts, tag locations, and publish without opening a laptop.',
    icon: <Calendar className="w-10 h-10 text-blue-700" />,
    iconBg: 'bg-blue-100',
  },
];

/** Notifications, Recent Generations, and the Video Studio project timeline
 * used to live here as sample data. They're now wired to real endpoints -
 * see useMobileNotifications.ts, HomeTab.tsx's gallery fetch, and
 * StudioTab.tsx respectively. Video Studio's past-projects list has no
 * backing data model yet (no video-project entity anywhere in apps/api),
 * so that one screen still shows an honest empty/desktop-handoff state
 * rather than fabricated project cards - see StudioTab.tsx. */

export const WIZARD_CONTENT_TYPES = ['Instagram Reel', 'Carousel', 'Blog Post'] as const;
export const WIZARD_GOALS = ['Awareness', 'Engagement', 'Sales'] as const;

export const WIZARD_DRAFT = {
  headline: 'Cozy season, cozier rewards',
  body: 'Our fall menu just dropped — and so did a new way to earn free drinks. Every order this week stacks points toward your next cup, on us.',
  hashtags: ['#FallMenu', '#LoyaltyProgram', '#NewArrival'],
};
