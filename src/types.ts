export type ViewType =
  | 'dashboard'
  | 'ai-studio'
  | 'projects'
  | 'campaigns'
  | 'calendar'
  | 'video-studio'
  | 'image-studio'
  | 'voice-studio'
  | 'brand-brain'
  | 'media-library'
  | 'automation'
  | 'ai-agents'
  | 'analytics'
  | 'marketplace'
  | 'team'
  | 'integrations'
  | 'billing'
  | 'settings'
  | 'help';

export type ThemeMode = 'light' | 'dark';

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  role: string;
  workspaceName: string;
}

export interface BrandBrain {
  businessName: string;
  industry: string;
  tagline: string;
  logoUrl: string;
  brandColors: string[];
  primaryFont: string;
  websiteUrl: string;
  productsAndServices: string[];
  mission: string;
  vision: string;
  toneOfVoice: string[];
  primaryCTA: string;
  targetAudience: string;
  competitors: string[];
  keywords: string[];
  socialAccounts: {
    platform: string;
    handle: string;
    connected: boolean;
  }[];
}

export interface Project {
  id: string;
  title: string;
  category: string;
  status: 'In Progress' | 'Review' | 'Completed' | 'Archived';
  itemCount: number;
  lastUpdated: string;
  campaign?: string;
  thumbnail?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Completed' | 'Scheduled';
  platforms: string[];
  startDate: string;
  endDate: string;
  contentCount: number;
  goal: string;
  reach: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  platform: 'Instagram' | 'LinkedIn' | 'YouTube' | 'TikTok' | 'Twitter/X' | 'Blog' | 'Newsletter';
  contentType: string;
  scheduledTime: string;
  status: 'Draft' | 'Review' | 'Approved' | 'Published' | 'Rejected';
  author: string;
  previewText?: string;
  mediaUrl?: string;
}

export interface GenerationHistoryItem {
  id: string;
  title: string;
  type: string;
  provider: string;
  createdAt: string;
  preview: string;
  tags: string[];
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: 'Idle' | 'Active' | 'Running' | 'Paused';
  icon: string;
  lastRun: string;
  tasksCompleted: number;
  accuracy: string;
  currentTask?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'research' | 'generate' | 'review' | 'publish' | 'analytics' | 'notification' | 'condition' | 'delay' | 'loop' | 'agent';
  title: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  status?: 'success' | 'running' | 'idle' | 'failed';
  config?: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: 'AI Models' | 'Voice & Audio' | 'Image & Media' | 'Social Platforms' | 'Storage & Sync' | 'Automation';
  description: string;
  icon: string;
  connected: boolean;
  status: 'Connected' | 'Not Configured' | 'Key Required';
  apiKey?: string;
}

export interface IndustryPack {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  badge: string;
  downloads: number;
  rating: number;
  includedTemplates: string[];
}

export interface VoiceProfile {
  id: string;
  name: string;
  language: string;
  gender: 'Female' | 'Male' | 'Neutral';
  accent: string;
  style: string;
  previewAudioUrl?: string;
  isCloned?: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'brand';
  size: string;
  updatedAt: string;
  url: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  avatar: string;
  status: 'Active' | 'Pending';
  lastActive: string;
}

export interface WizardState {
  contentType: string;
  goal: string;
  audience: string;
  brandContext: string;
  aiProvider: string;
  customPrompt?: string;
  topic: string;
}

export interface AIResponsePayload {
  id: string;
  contentType: string;
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  imagePromptSuggestions: string[];
  suggestedPlatforms: string[];
  estimatedReachScore: number;
}
