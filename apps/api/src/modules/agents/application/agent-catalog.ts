export const AGENT_IDS = [
  'research',
  'strategy',
  'content',
  'video-script',
  'repurposing',
  'seo',
  'compliance',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  /** Shown as the input placeholder - tells the user what to give the agent. */
  inputHint: string;
  /** Task-specific instructions appended to the brand-aware system prompt. */
  instructions: string;
}

/** Text agents that genuinely run today: each one is a specialised prompt over
 * the workspace's Brand Brain. They work from the model's general knowledge and
 * what the user pastes in - none of them browse the web, read analytics or
 * publish on their own. */
export const AGENT_CATALOG: AgentDefinition[] = [
  {
    id: 'research',
    name: 'Research Agent',
    role: 'Topic & Angle Research',
    description:
      'Suggests timely, on-brand topics, audience questions and content angles. Works from general knowledge, not live web data.',
    inputHint: "e.g. Topic ideas for parents planning their child's education, for the next 2 weeks",
    instructions:
      'Produce 8 specific content topic ideas. For each: a working title, the audience question it answers, the best format (reel, post, WhatsApp, article) and a one-line angle. Do not claim to have looked up current news or statistics; where a fact would need checking, say so.',
  },
  {
    id: 'strategy',
    name: 'Strategy Agent',
    role: 'Campaign Planner',
    description: 'Turns a business goal into a structured campaign brief and a simple content calendar.',
    inputHint: 'e.g. Generate enquiries for retirement plans among salaried professionals in Amritsar this month',
    instructions:
      'Produce a campaign brief: objective, target audience, 3 key messages, recommended channels and formats, a 2-week content calendar (day, format, topic), and how to judge results. Keep it practical for a single small team.',
  },
  {
    id: 'content',
    name: 'Content Agent',
    role: 'Copywriter',
    description: 'Drafts on-brand copy for posts, captions, newsletters and articles from a short brief.',
    inputHint: 'e.g. Write a Facebook post explaining why term insurance matters for young families',
    instructions:
      'Write the requested copy in the brand voice. Offer two variations with different hooks. Use only facts given in the brief; mark anything missing as [VERIFY: detail].',
  },
  {
    id: 'video-script',
    name: 'Video Script Agent',
    role: 'Scripting',
    description: 'Turns a brief into a scene-by-scene video script with on-screen text, voiceover and visuals.',
    inputHint: 'e.g. 30-second reel about starting retirement planning in your 30s',
    instructions:
      'Write a scene-by-scene script. For each scene give: duration, on-screen text, voiceover line, visual / B-roll description. Keep voiceover natural and under the time limit, and end with the brand call-to-action.',
  },
  {
    id: 'repurposing',
    name: 'Repurposing Agent',
    role: '1-to-N Content Multiplier',
    description: 'Takes one piece of content you paste in and turns it into several platform-ready versions.',
    inputHint: 'Paste the article, script or post you want to repurpose',
    instructions:
      'From the pasted content produce: a LinkedIn post, a Facebook post, a 40-word WhatsApp message, a 30-second reel script, 3 short quote-style captions and an email subject line with preview text. Do not add facts that are not in the source.',
  },
  {
    id: 'seo',
    name: 'SEO Agent',
    role: 'Search Optimisation',
    description:
      'Suggests keywords, titles, meta descriptions and an outline for an article. Not connected to live search data.',
    inputHint: 'e.g. Article on choosing a pension plan - target city Amritsar',
    instructions:
      'Produce: primary and secondary keyword suggestions (clearly labelled as suggestions, not measured search volumes), 3 SEO title options under 60 characters, a meta description under 155 characters, and an article outline with H2/H3 headings and FAQs.',
  },
  {
    id: 'compliance',
    name: 'Compliance Reviewer',
    role: 'Claims & Wording Check',
    description:
      'Reviews a draft against your Brand Brain compliance rules and points out risky claims, missing disclosures and unverified figures.',
    inputHint: 'Paste the draft caption, script or creative copy to review',
    instructions:
      'Review the pasted draft strictly against the brand guidelines and compliance rules. Output: 1) Verdict (Pass / Needs changes / Do not publish). 2) A numbered list of issues, each quoting the exact text, naming the rule it breaks and proposing a compliant rewrite. 3) A fully revised version of the draft. Be strict; if unsure whether a claim is supported, flag it. You are an aid to, not a replacement for, the required human and regulatory approval.',
  },
];
