import { BrandBrain } from './types';

/** What a workspace with no saved Brand Brain starts from - deliberately empty
 * (no sample company) so a new account never sees, or generates from, someone
 * else's brand. */
export const emptyBrandBrain: BrandBrain = {
  businessName: '',
  industry: '',
  tagline: '',
  logoUrl: '',
  brandColors: [],
  primaryFont: '',
  websiteUrl: '',
  productsAndServices: [],
  mission: '',
  vision: '',
  toneOfVoice: [],
  primaryCTA: '',
  targetAudience: '',
  competitors: [],
  keywords: [],
  guidelines: '',
  socialAccounts: [],
  advisorProfile: null,
};
