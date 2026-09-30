import type { BrandBrain } from '../types';

export interface BrandTemplate {
  id: string;
  label: string;
  description: string;
  profile: Omit<BrandBrain, 'id'>;
}

const LIC_GUIDELINES = `LANGUAGE & STYLE
- Write in Hindi, English or the requested regional Indian language. Use simple everyday words, not insurance jargon.
- Tone: trustworthy, reassuring, family-oriented, professional, respectful, emotionally warm.
- Visual style: clean, trustworthy, LIC-inspired blue/yellow layouts with white space; Indian families, children's education, retirement and financial-planning imagery; clear information hierarchy. Use red only as an accent for important information.

COMPLIANCE RULES (HARD RULES - never break these)
1. Never invent a LIC product, plan number, premium, benefit, maturity value or return.
2. Never present an illustrative calculation as a guaranteed outcome. Label every numerical example "illustrative" and base it only on verified product information (exact product, age, premium, payment term, benefits).
3. When mentioning a guarantee, state its conditions and limitations prominently (IRDAI requirement).
4. Never use claims such as "double your money", "100% guaranteed returns", "sure-shot profit" or "highest returns" unless the exact approved product documentation supports them.
5. Product-specific content must make clear it is an insurance product and use the approved product name and benefit wording.
6. Do not alter official LIC logos or create misleading LIC branding.
7. Advisor/agent content must clearly identify the advisor or intermediary with contact details and the applicable licence/registration details where required.
8. Social-media creatives must carry the disclaimers and advertisement/reference details required by the applicable LIC/IRDAI approval process before publishing.
9. Do not call any plan "best", "number one" or suitable for everyone without substantiation.
10. Treat current official LIC product documentation as the source of truth, not old posters or social posts. If a figure or product detail is not provided, ask for it or leave a clearly marked placeholder instead of guessing.`;

export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    id: 'lic-india',
    label: 'LIC (Life Insurance Corporation of India)',
    description: 'Trust-first life insurance voice with IRDAI-aware compliance rules built in.',
    profile: {
      businessName: 'Life Insurance Corporation of India (LIC)',
      industry: 'Life Insurance',
      tagline: 'Zindagi Ke Saath Bhi, Zindagi Ke Baad Bhi.',
      logoUrl: '',
      // Approximate LIC-inspired palette - adjust to the exact brand hex values.
      brandColors: ['#0B4DA2', '#FFC20E', '#FFFFFF', '#D7263D'],
      primaryFont: '',
      websiteUrl: 'https://licindia.in',
      productsAndServices: [
        'Protection / Term Insurance',
        'Endowment & Savings Plans',
        'Money-Back Plans',
        'Whole-Life Plans',
        'Pension & Annuity Plans',
        'ULIPs',
        'Micro Insurance',
        'Riders',
      ],
      mission:
        'Help people plan for financial protection and long-term life goals through life insurance and related solutions, with a strong emphasis on trust and service.',
      vision: '',
      toneOfVoice: [
        'Trustworthy',
        'Reassuring',
        'Family-oriented',
        'Professional',
        'Simple',
        'Respectful',
        'Educational',
        'Warm',
      ],
      primaryCTA: 'आज ही संपर्क करें और अपनी जरूरत के अनुसार योजना की जानकारी लें।',
      targetAudience:
        "Individuals, parents, families, young earners, working professionals, business owners, retirees, and people planning for children's education, retirement and financial protection.",
      competitors: [],
      keywords: [
        'life insurance',
        'family protection',
        'retirement planning',
        "children's education",
        'term plan',
        'pension plan',
      ],
      guidelines: LIC_GUIDELINES,
      socialAccounts: [],
      // Advisor the content is published on behalf of; appended to every generation by the server.
      advisorProfile: {
        name: 'Rajni Mehra',
        phone: '9988117283',
        city: 'Amritsar',
        licenceNumber: '17499150',
      },
    },
  },
];
