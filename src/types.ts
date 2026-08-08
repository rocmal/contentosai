export type ViewType =
  | 'dashboard'
  | 'ai-studio'
  | 'projects'
  | 'campaigns'
  | 'calendar'
  | 'video-studio'
  | 'image-studio'
  | 'voice-studio'
  | 'character-studio'
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
  | 'profile'
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
  /** Present once loaded from/saved to the real brand-profiles backend; absent for the local mock default shown before that fetch resolves. */
  id?: string;
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
  /** Freeform sample of the brand's writing style / voice guidelines. */
  guidelines?: string;
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

export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';

/** Mirrors apps/api CampaignResponseDto - only the fields the backend
 * actually persists. No platforms/progress/reach/postsCount - those were
 * mock-only display fields with no backing data model. */
export interface Campaign {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
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
