import type { BrandBrain } from '../types';

export interface BrandTemplate {
  id: string;
  label: string;
  category: string;
  description: string;
  profile: Omit<BrandBrain, 'id'>;
}

/** Applies a template to an existing Brand Brain: the template's identity,
 * voice and rules replace the current ones, but the workspace's own logo,
 * social accounts and advisor details are kept (a template never knows those). */
export function applyBrandTemplate(current: BrandBrain, template: BrandTemplate): BrandBrain {
  return {
    ...template.profile,
    id: current.id,
    logoUrl: current.logoUrl || template.profile.logoUrl,
    socialAccounts: current.socialAccounts.length ? current.socialAccounts : template.profile.socialAccounts,
    advisorProfile: current.advisorProfile ?? template.profile.advisorProfile ?? null,
  };
}

const INSURANCE_RULES = `COMPLIANCE RULES (HARD RULES - never break these)
1. Never invent an insurance product, plan number, premium, benefit, maturity value or return.
2. Never present an illustrative calculation as a guaranteed outcome. Label every numerical example "illustrative" and base it only on verified product information (exact product, age, premium, payment term, benefits).
3. When mentioning a guarantee, state its conditions and limitations prominently (IRDAI requirement).
4. Never use claims such as "double your money", "100% guaranteed returns", "sure-shot profit" or "highest returns" unless the exact approved product documentation supports them.
5. Product-specific content must make clear it is an insurance product and use the approved product name and benefit wording.
6. Do not alter official insurer logos or create misleading branding.
7. Advisor/agent content must clearly identify the advisor or intermediary with contact details and the applicable licence/registration details where required.
8. Social-media creatives must carry the disclaimers and advertisement/reference details required by the applicable insurer/IRDAI approval process before publishing.
9. Do not call any plan "best", "number one" or suitable for everyone without substantiation.
10. Treat current official product documentation as the source of truth, not old posters or social posts. If a figure or product detail is not provided, ask for it or leave a clearly marked placeholder instead of guessing.`;

const LIC_GUIDELINES = `LANGUAGE & STYLE
- Write in Hindi, English or the requested regional Indian language. Use simple everyday words, not insurance jargon.
- Tone: trustworthy, reassuring, family-oriented, professional, respectful, emotionally warm.
- Visual style: clean, trustworthy, LIC-inspired blue/yellow layouts with white space; Indian families, children's education, retirement and financial-planning imagery; clear information hierarchy. Use red only as an accent for important information.

${INSURANCE_RULES}`;

const ADVISOR_GUIDELINES = `LANGUAGE & STYLE
- Write in the language the audience uses (English, Hindi, Hinglish or Punjabi). Use simple everyday words, not insurance jargon.
- Tone: trustworthy, reassuring, educational, never pushy. Lead with the customer's need, not the product.

${INSURANCE_RULES}`;

const REAL_ESTATE_GUIDELINES = `LANGUAGE & STYLE
- Clear, honest, benefit-led property marketing. Describe what is actually on offer; let the visuals sell the lifestyle.

RULES
1. Never invent prices, carpet areas, possession dates, amenities, approvals or returns. Use only details provided in the brief; otherwise leave a marked placeholder like [VERIFY: price].
2. Do not promise appreciation, rental yield or "guaranteed" investment returns.
3. Where the law requires it (for example RERA registration), include the registration number in published material; if it was not provided, add a [VERIFY: RERA registration no.] placeholder.
4. Distinguish clearly between ready-to-move and under-construction properties.
5. Artist impressions and renders must be described as such.
6. Do not make comparative claims about competing projects.`;

const HEALTHCARE_GUIDELINES = `LANGUAGE & STYLE
- Calm, caring, plain-language health education. Explain, do not alarm.

RULES
1. Never diagnose, prescribe, or promise a cure or guaranteed outcome.
2. Never claim superiority over other doctors or clinics, or use "best", "No.1" or "100% success" language.
3. Do not publish identifiable patient information, before/after results or testimonials unless explicit written consent and any required approvals are confirmed.
4. Present general health information as education, and encourage readers to consult a qualified doctor for their own situation.
5. Include the practitioner's name and registration details where required; if not provided, add a [VERIFY: registration details] placeholder.
6. Do not invent statistics, studies or credentials.`;

const SAAS_GUIDELINES = `LANGUAGE & STYLE
- Clear, specific, credible B2B writing: lead with the customer problem, prove with concrete detail, avoid hype.

RULES
1. Never invent customer names, logos, metrics, benchmarks or testimonials. Use only facts given in the brief; otherwise leave a marked placeholder like [VERIFY: metric].
2. Do not claim features that are not in the provided product description.
3. Avoid unverifiable superlatives ("the best", "#1", "revolutionary").
4. Name competitors only when the brief asks for a comparison, and keep comparisons factual.`;

export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    id: 'lic-india',
    label: 'LIC (Life Insurance Corporation of India)',
    category: 'Insurance',
    description:
      'Trust-first life insurance voice with IRDAI-aware compliance rules, LIC product categories and the advisor details used on every post.',
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
  {
    id: 'insurance-advisor',
    label: 'Independent Insurance Advisor',
    category: 'Insurance',
    description:
      'For an insurance advisor or agent of any insurer: education-first content with the same IRDAI-aware rules. Add your own advisor details after installing.',
    profile: {
      businessName: 'Your Name - Insurance Advisor',
      industry: 'Insurance Advisory',
      tagline: 'Plan early. Protect what matters.',
      logoUrl: '',
      brandColors: ['#0B4DA2', '#FFFFFF'],
      primaryFont: '',
      websiteUrl: '',
      productsAndServices: [
        'Term Insurance',
        'Health Insurance',
        'Savings & Endowment Plans',
        'Pension & Retirement Plans',
        "Child Education Plans",
      ],
      mission: 'Help families understand their protection needs and choose suitable cover, without pressure.',
      vision: '',
      toneOfVoice: ['Trustworthy', 'Educational', 'Reassuring', 'Simple', 'Respectful'],
      primaryCTA: 'Message me to understand which cover fits your family.',
      targetAudience: 'Young families, salaried professionals, small business owners and people approaching retirement.',
      competitors: [],
      keywords: ['insurance advisor', 'term insurance', 'health insurance', 'retirement planning', 'family protection'],
      guidelines: ADVISOR_GUIDELINES,
      socialAccounts: [],
      advisorProfile: null,
    },
  },
  {
    id: 'real-estate',
    label: 'Real Estate & Property',
    category: 'Real Estate',
    description: 'Honest, detail-led property marketing voice with rules against invented prices, approvals and returns.',
    profile: {
      businessName: 'Your Real Estate Brand',
      industry: 'Real Estate',
      tagline: '',
      logoUrl: '',
      brandColors: ['#1F2937', '#C8A24B', '#FFFFFF'],
      primaryFont: '',
      websiteUrl: '',
      productsAndServices: ['Residential Sales', 'Rentals', 'Commercial Property', 'Plots & Land', 'Property Management'],
      mission: 'Help buyers and renters find the right property with clear, honest information.',
      vision: '',
      toneOfVoice: ['Professional', 'Warm', 'Transparent', 'Aspirational', 'Clear'],
      primaryCTA: 'Book a site visit today.',
      targetAudience: 'First-time home buyers, families upgrading, NRIs, investors and tenants in your city.',
      competitors: [],
      keywords: ['property', 'home loan', 'site visit', 'ready to move', 'new launch'],
      guidelines: REAL_ESTATE_GUIDELINES,
      socialAccounts: [],
      advisorProfile: null,
    },
  },
  {
    id: 'healthcare-clinic',
    label: 'Healthcare & Wellness Clinic',
    category: 'Healthcare',
    description: 'Caring, plain-language health education with rules against diagnosis, cure claims and unconsented testimonials.',
    profile: {
      businessName: 'Your Clinic',
      industry: 'Healthcare',
      tagline: '',
      logoUrl: '',
      brandColors: ['#0E7490', '#FFFFFF', '#E0F2FE'],
      primaryFont: '',
      websiteUrl: '',
      productsAndServices: ['Consultations', 'Preventive Health Check-ups', 'Specialist Care', 'Wellness Programmes'],
      mission: 'Make good health information easy to understand and care easy to access.',
      vision: '',
      toneOfVoice: ['Caring', 'Calm', 'Clear', 'Professional', 'Reassuring'],
      primaryCTA: 'Book an appointment with our team.',
      targetAudience: 'Local families, working adults and seniors looking for trusted, approachable care.',
      competitors: [],
      keywords: ['health check-up', 'preventive care', 'wellness', 'appointment'],
      guidelines: HEALTHCARE_GUIDELINES,
      socialAccounts: [],
      advisorProfile: null,
    },
  },
  {
    id: 'b2b-saas',
    label: 'B2B SaaS & Software',
    category: 'Technology',
    description: 'Clear, credible B2B voice with rules against invented metrics, customers and feature claims.',
    profile: {
      businessName: 'Your SaaS Company',
      industry: 'B2B SaaS',
      tagline: '',
      logoUrl: '',
      brandColors: ['#2563EB', '#0F172A', '#FFFFFF'],
      primaryFont: '',
      websiteUrl: '',
      productsAndServices: ['Your core product', 'Integrations', 'Onboarding & Support'],
      mission: 'Solve a specific customer problem better than the tools teams use today.',
      vision: '',
      toneOfVoice: ['Clear', 'Credible', 'Practical', 'Confident', 'Helpful'],
      primaryCTA: 'Book a demo.',
      targetAudience: 'Founders, product leaders and operations teams at growing companies.',
      competitors: [],
      keywords: ['automation', 'productivity', 'workflow', 'integration'],
      guidelines: SAAS_GUIDELINES,
      socialAccounts: [],
      advisorProfile: null,
    },
  },
];
