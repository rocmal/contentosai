import React from 'react';
import { Bell, Calendar, CheckCircle2, Clock, Sparkles, Users as UsersIcon, Video } from 'lucide-react';
import { NotificationItem, OnboardSlide, PastStudioProject, RecentGeneration } from './types';

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

/** No notifications API exists yet (see apps/api) - this is UI-only sample
 * content so the Notifications screen has something real to lay out against.
 * Swap for a real feed once a notifications endpoint ships. */
export const NOTIF_TODAY: NotificationItem[] = [
  { id: 'n1', title: 'Fall Menu Launch reel published to Instagram', time: '2:31 PM', unread: true, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, iconBg: 'bg-emerald-50' },
  { id: 'n2', title: 'TikTok post scheduled for 5:00 PM', time: '12:00 PM', unread: true, icon: <Clock className="w-4 h-4 text-blue-700" />, iconBg: 'bg-blue-50' },
  { id: 'n3', title: 'A teammate approved your caption draft', time: '11:14 AM', unread: false, icon: <UsersIcon className="w-4 h-4 text-slate-600" />, iconBg: 'bg-slate-50' },
];

export const NOTIF_EARLIER: NotificationItem[] = [
  { id: 'n4', title: 'Character Studio avatars are now live', time: 'Yesterday', unread: false, icon: <Sparkles className="w-4 h-4 text-blue-700" />, iconBg: 'bg-blue-100' },
  { id: 'n5', title: 'A new teammate joined your workspace', time: '3 days ago', unread: false, icon: <UsersIcon className="w-4 h-4 text-slate-600" />, iconBg: 'bg-slate-50' },
];

export const NOTIF_BELL_HAS_UNREAD = NOTIF_TODAY.some((n) => n.unread);

/** Recent AI-Studio outputs. No "recent generations" list endpoint exists
 * yet - Media Library has assets but not a chronological generation feed -
 * so this stays sample content until that's built. */
export const RECENT_GENERATIONS: RecentGeneration[] = [
  { id: 'g1', type: 'IMAGE', title: 'Pumpkin latte flat lay', time: '2h ago' },
  { id: 'g2', type: 'VIDEO', title: 'Barista pour-over b-roll', time: '5h ago' },
  { id: 'g3', type: 'VOICE', title: 'Fall menu VO — warm female', time: '1d ago' },
];

export const PAST_VIDEO_PROJECTS: PastStudioProject[] = [
  { id: 'p1', title: 'Behind the Roast', duration: '1:02', status: 'Published' },
  { id: 'p2', title: 'Espresso Machine Demo', duration: '0:35', status: 'Draft' },
  { id: 'p3', title: 'Customer Testimonial', duration: '0:58', status: 'Review' },
];

export const CONTINUE_PROJECT = { title: 'Fall Menu Launch — Reel', duration: '0:42', stepLabel: 'Scenes (3/5)' };
export const STEP_NAMES = ['Script', 'Scenes', 'Voiceover', 'B-roll', 'Export'];
export const CURRENT_STEP_INDEX = 1;

export const WIZARD_CONTENT_TYPES = ['Instagram Reel', 'Carousel', 'Blog Post'] as const;
export const WIZARD_GOALS = ['Awareness', 'Engagement', 'Sales'] as const;

export const WIZARD_DRAFT = {
  headline: 'Cozy season, cozier rewards',
  body: 'Our fall menu just dropped — and so did a new way to earn free drinks. Every order this week stacks points toward your next cup, on us.',
  hashtags: ['#FallMenu', '#LoyaltyProgram', '#NewArrival'],
};

export const BELL_ICON = <Bell className="w-[17px] h-[17px] text-slate-900" />;
