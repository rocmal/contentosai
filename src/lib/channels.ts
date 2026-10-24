import React from 'react';
import { Facebook, Linkedin, Youtube } from 'lucide-react';
import { SocialPlatform } from './api';

/** One icon per publishing channel, used by the sidebar, the Create menu, the Calendar and Ctrl+K so a channel looks the same everywhere. */
export const CHANNEL_ICON: Partial<Record<SocialPlatform, React.FC<{ className?: string }>>> = {
  linkedin: Linkedin,
  facebook: Facebook,
  youtube: Youtube,
};

/** The channel's brand colour as a text class, for icons on a light surface. */
export const CHANNEL_TEXT: Partial<Record<SocialPlatform, string>> = {
  linkedin: 'text-[#0A66C2]',
  facebook: 'text-[#1877F2]',
  youtube: 'text-red-500',
};
