import { ViewType } from '../types';

/** The page title and subtitle shown in the header for each screen (the only place they appear), also used by the
 * Co-pilot to name the screen the person is on. Add an entry when you add or rename a screen. */
export const VIEW_TITLES: Record<ViewType, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Your credits, content and publishing numbers at a glance.',
  },
  'ai-studio': {
    title: 'AI Studio Wizard',
    subtitle: '6-Step zero-prompt content generation engine.',
  },
  projects: {
    title: 'Projects',
    subtitle: 'Manage and organize your multi-channel content initiatives.',
  },
  campaigns: {
    title: 'Campaigns',
    subtitle: 'Track cross-platform campaigns, goals, and target reach.',
  },
  calendar: {
    title: 'Content Calendar',
    subtitle: 'See your scheduled and published posts across Facebook, Instagram, LinkedIn and YouTube.',
  },
  'video-studio': {
    title: 'Video Studio',
    subtitle: 'Make a short video from a prompt or template, add narration and text, then download or schedule it.',
  },
  'image-studio': {
    title: 'Image Studio',
    subtitle: 'Describe a picture and get the right size for each platform you post to.',
  },
  'voice-studio': {
    title: 'Voice Studio',
    subtitle: 'Turn a script into a voiceover in Hindi, Punjabi or English, or use your own recorded voice.',
  },
  'character-studio': {
    title: 'Character Studio',
    subtitle: 'Upload a photo, add a script and voice, get a talking-avatar video.',
  },
  'brand-brain': {
    title: 'Brand Brain Memory',
    subtitle: 'Your central brand knowledge base used across all AI generations.',
  },
  'media-library': {
    title: 'Gallery',
    subtitle: 'Your creations and your team - rename, download, or start again from any of them.',
  },
  'linkedin-posts': {
    title: 'LinkedIn Posts',
    subtitle: 'Write, schedule and track posts on your LinkedIn profile.',
  },
  'facebook-posts': {
    title: 'Facebook Posts',
    subtitle: 'Post videos to your Facebook Page and track what is scheduled, published or failed.',
  },
  'youtube-posts': {
    title: 'YouTube',
    subtitle: 'Upload and schedule videos to your YouTube channel.',
  },
  automation: {
    title: 'Automation Builder',
    subtitle: 'n8n-inspired visual workflow orchestrator for 10x distribution.',
  },
  'ai-agents': {
    title: 'AI Agents Fleet',
    subtitle: '10 Specialized autonomous agents executing research, drafting & SEO.',
  },
  analytics: {
    title: 'Analytics Overview',
    subtitle: 'Executive insights, engagement scores, CTR & AI strategy recommendations.',
  },
  marketplace: {
    title: 'Marketplace Packs',
    subtitle: '1-Click industry content packs for B2B, E-commerce, Real Estate & Healthcare.',
  },
  team: {
    title: 'Team',
    subtitle: 'Invite teammates and manage who can do what in your workspace.',
  },
  integrations: {
    title: 'Integrations',
    subtitle: 'Connect the social accounts you publish to.',
  },
  billing: {
    title: 'Billing & Credits',
    subtitle: 'Your plan, your credits, and renewing or upgrading.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Theme and workspace details.',
  },
  profile: {
    title: 'Profile',
    subtitle: 'Your account, plan, credit usage and team seats.',
  },
  help: {
    title: 'Help Center',
    subtitle: 'Step-by-step guides and answers to common questions.',
  },
};
