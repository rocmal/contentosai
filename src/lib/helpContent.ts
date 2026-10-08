import type { ViewType } from '../types';

export type FaqCategory = 'Getting started' | 'Studios' | 'Credits' | 'Gallery & team' | 'Safety & privacy';

export interface HowTo {
  id: string;
  title: string;
  steps: string[];
  view: ViewType;
  action: string;
  /** Extra words people use for this topic; the chat matches questions against these. */
  keywords?: string[];
}

export const HOW_TO: HowTo[] = [
  {
    id: 'h-image',
    keywords: ['image','picture','photo','poster','size','sizes','platform'],
    title: 'Make an image for several platforms',
    steps: [
      'Open Image Studio and describe the picture. Tap "Improve with AI" for a more detailed prompt, or "Speak" to say it aloud.',
      'Tick every place you will post it. Each one gets its own exact size.',
      'Choose a quality, check the credit cost, and press Generate.',
      'Preview each result, then "Save to gallery" for the ones you want to keep.',
    ],
    view: 'image-studio',
    action: 'Open Image Studio',
  },
  {
    id: 'h-video',
    keywords: ['video','reel','clip','template','narration','animation'],
    title: 'Make a video from a prompt',
    steps: [
      'Open Video Studio. Pick a template (for example "Family protection") or write your own idea.',
      'Edit the words to match your business, then choose a format - reel, square, widescreen or product ad.',
      'Press Generate. It usually takes a minute or two.',
      'Add narration or text, then download it or schedule it to your social accounts.',
    ],
    view: 'video-studio',
    action: 'Open Video Studio',
  },
  {
    id: 'h-voice',
    keywords: ['voice','record','recording','voiceover','audio','microphone','narration'],
    title: 'Record your own voice',
    steps: [
      'Open Voice Studio and choose "Record your own voice".',
      'Read the sample text aloud for at least 30 seconds, somewhere quiet and close to the microphone.',
      'Play it back, give the voice a name, and confirm it is your own voice (or you have permission).',
      'Your voice now appears under "My recorded voices" for any script.',
    ],
    view: 'voice-studio',
    action: 'Open Voice Studio',
  },
  {
    id: 'h-again',
    keywords: ['again','history','recreate','previous','old','before'],
    title: 'Start again from something you made',
    steps: [
      'Open Gallery and choose the "Creation history" tab.',
      'Find the item - you can search by what you asked for.',
      'Press "Create again". The right studio opens with the same prompt filled in.',
      'Change a word or two and generate.',
    ],
    view: 'media-library',
    action: 'Open Gallery',
  },
  {
    id: 'h-facebook',
    title: 'Create Facebook content',
    keywords: ['facebook', 'fb', 'post', 'content', 'page', 'story'],
    steps: [
      'Open Image Studio, describe the picture, and tick "Facebook Post" (1200 x 630) and/or "Facebook Story" (1080 x 1920). Each gets its own exact size.',
      'Choose a quality, check the credit cost, press Generate, and "Save to gallery" for the ones you like. Check any text in the image before you post.',
      'For a video, open Video Studio, pick a template or write your idea, and choose the format that fits (reel or square for Facebook).',
      'Connect your Facebook page once in Integrations, then schedule the finished video from Video Studio. Scheduled posts appear in Calendar.',
    ],
    view: 'image-studio',
    action: 'Open Image Studio',
  },
  {
    id: 'h-instagram',
    title: 'Create Instagram content',
    keywords: ['instagram', 'insta', 'ig', 'reel', 'story', 'post', 'content'],
    steps: [
      'Open Image Studio and describe the picture. Tick "Instagram Post" (1080 x 1350), "Instagram Square" or "Instagram Story / Reel cover".',
      'Press Generate and save the ones you want to the Gallery.',
      'For a reel, make it in Video Studio using the reel format, then add narration or text.',
      'Make your Instagram a Professional account and connect it in Integrations, then schedule the finished video from Video Studio.',
    ],
    view: 'image-studio',
    action: 'Open Image Studio',
  },
  {
    id: 'h-connect',
    title: 'Connect Facebook, Instagram, LinkedIn or YouTube',
    keywords: ['connect', 'link', 'integrate', 'integration', 'account', 'facebook', 'instagram', 'linkedin', 'youtube', 'social'],
    steps: [
      'Open Integrations from the sidebar.',
      'Choose the platform and press Connect, then sign in and allow access.',
      'For Instagram, switch the account to a Professional account first (Instagram app: Settings, then Account type and tools).',
      'Once connected, you can schedule finished videos from Video Studio.',
    ],
    view: 'integrations',
    action: 'Open Integrations',
  },
  {
    id: 'h-schedule',
    title: 'Schedule a post',
    keywords: ['schedule', 'scheduling', 'publish', 'posting', 'calendar', 'later', 'automatic'],
    steps: [
      'Connect your accounts in Integrations (one time).',
      'Finish your video in Video Studio, then use the Schedule Post option and pick the account and time.',
      'Scheduled posts show in Calendar, where you can see what is coming up.',
    ],
    view: 'calendar',
    action: 'Open Calendar',
  },
];

export const FAQS: { id: string; category: FaqCategory; question: string; answer: string }[] = [
  {
    id: 'faq-1',
    category: 'Getting started',
    question: 'What can I do in Lumora?',
    answer:
      'Lumora has three studios: Image Studio for pictures, Video Studio for short videos, and Voice Studio for voiceovers. Everything you save goes to your Gallery, and your Dashboard shows your credits and recent work.',
  },
  {
    id: 'faq-2',
    category: 'Getting started',
    question: 'Can I type in Hindi or Punjabi?',
    answer:
      'Yes. Use the "Speak" button next to a prompt or script box and talk in Hindi, Punjabi or English - Lumora types it for you. You can also type in those languages directly. Voice Studio has Indian-language voices.',
  },
  {
    id: 'faq-3',
    category: 'Studios',
    question: 'Why is the text in my image wrong or missing?',
    answer:
      'AI image tools often misspell words and numbers. "No text in the image" is ticked by default for that reason - add your name and phone number afterwards in a design tool. If you untick it so the picture includes your wording, check every letter and digit before posting.',
  },
  {
    id: 'faq-4',
    category: 'Studios',
    question: 'How long does a video take, and how long can it be?',
    answer:
      'Usually a minute or two, sometimes longer when the AI service is busy. AI clips are 4 to 8 seconds long. The format you choose (reel, square, widescreen) sets the shape. You can add narration and text in the editing step afterwards.',
  },
  {
    id: 'faq-5',
    category: 'Studios',
    question: 'How do I record my own voice?',
    answer:
      'In Voice Studio choose "Record your own voice", read the sample aloud for at least 30 seconds, name it and confirm it is your own voice. It then appears in your voice list. If you see a "not set up" message, voice recording is not switched on for your account yet - contact support.',
  },
  {
    id: 'faq-6',
    category: 'Credits',
    question: 'How are credits used?',
    answer:
      'Credits are taken when you generate, and the cost is shown before you press the button. An image costs 2 to 50 credits depending on quality. A voiceover costs about 7 credits per minute with Indian-language voices. An AI video costs about 180 credits for a clip of up to 10 seconds, taken when the job starts. If a request is turned down before it starts, no credits are used. The credits in your plan are topped up each month, and unused credits do not carry over. New workspaces get a small one-time free allowance. The Dashboard shows what you have used by studio.',
  },
  {
    id: 'faq-6b',
    category: 'Credits',
    question: 'What if a generation fails or the result is not what I wanted?',
    answer:
      'If an image or video request is turned down before it starts, nothing is charged and you will see a message saying so. A video that is accepted but fails later still uses its credits, so please contact support and we will look into it. A result that simply is not what you hoped for counts as a normal generation - try "Improve with AI" on the prompt, or start again from the Gallery with small changes.',
  },
  {
    id: 'faq-7',
    category: 'Credits',
    question: 'Do I pay again if I make the same video twice?',
    answer:
      'No. If you ask Video Studio for the same prompt, length and format again, you get your saved video straight away, free. Use "Make a new version" if you want a fresh one - that uses credits.',
  },
  {
    id: 'faq-8',
    category: 'Gallery & team',
    question: 'Where do my creations go?',
    answer:
      'Videos and voiceovers are saved automatically. Images are kept only when you press "Save to gallery". Find everything in Gallery, under "My gallery", and see what you asked for under "Creation history".',
  },
  {
    id: 'faq-9',
    category: 'Gallery & team',
    question: 'Can my team see what I make?',
    answer:
      'Yes - "Team gallery" shows everything saved in your workspace, with who made it. Only the person who made an item (or a workspace admin) can rename or delete it.',
  },
  {
    id: 'faq-10',
    category: 'Gallery & team',
    question: 'How do I start again from something I made before?',
    answer:
      'Open Gallery, go to "Creation history" (or find it on your Dashboard under "Pick up where you left off") and press "Create again". The studio opens with that prompt filled in. Items saved before this feature was added do not have a saved prompt.',
  },
  {
    id: 'faq-11',
    category: 'Gallery & team',
    question: 'Which social accounts can I post to?',
    answer:
      'Connect your accounts in Integrations - Facebook, Instagram, LinkedIn and YouTube are supported. Then use the schedule option when your video is finished in Video Studio. Scheduled posts show in Calendar.',
  },
  {
    id: 'faq-12',
    category: 'Safety & privacy',
    question: 'Can I post AI-made content as it is, for insurance or finance?',
    answer:
      'Treat everything as a draft. AI can get faces, numbers and wording wrong. Before posting, check names, phone numbers and licence details, and make sure nothing promises returns or benefits you cannot stand behind. Follow your regulator\'s advertising rules (for example IRDAI for insurance).',
  },
  {
    id: 'faq-13',
    category: 'Safety & privacy',
    question: 'Is my content private?',
    answer:
      'Your creations are visible only to people in your workspace. Your prompts are sent to the AI providers we use to make the result, under their API terms. We do not use your content to train our own models. Only record a voice that is yours, or that you have permission to use.',
  },
];

// ---------------------------------------------------------------------------
// Chat lookup: answer common "how do I..." questions from the guides above, free and instantly.
// ---------------------------------------------------------------------------

export interface HelpAnswer {
  title: string;
  text: string;
  view?: ViewType;
  action?: string;
}

const STOP_WORDS = new Set(
  (
    'a an the to of in on for with and or is are was be can could would should do does did i me my we you your it this that ' +
    'how what where when why which who whom want need like please tell show give help guide steps step tutorial about make ' +
    'create generate use using get got new some any'
  ).split(' '),
);

/** Lower-case words, light plural stripping, without filler. */
function meaningfulTokens(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
  return Array.from(new Set(words));
}

/** Only "how do I..." style questions are answered from the guides; requests to write content go to the AI. */
const QUESTION_START = /^\s*(?:how|where|what|which|why|when|can i|can we|could i|do i|does|is there|are there|steps|guide|tutorial|help)\b/i;

interface Entry {
  strong: Set<string>;
  all: Set<string>;
  answer: HelpAnswer;
}

const ENTRIES: Entry[] = [
  ...HOW_TO.map((guide): Entry => {
    const strong = new Set(meaningfulTokens(`${guide.title} ${(guide.keywords ?? []).join(' ')}`));
    const all = new Set([...strong, ...meaningfulTokens(guide.steps.join(' '))]);
    return {
      strong,
      all,
      answer: {
        title: guide.title,
        text: guide.steps.map((step, i) => `${i + 1}. ${step}`).join('\n'),
        view: guide.view,
        action: guide.action,
      },
    };
  }),
  ...FAQS.map((faq): Entry => {
    const strong = new Set(meaningfulTokens(faq.question));
    const all = new Set([...strong, ...meaningfulTokens(faq.answer)]);
    return { strong, all, answer: { title: faq.question, text: faq.answer } };
  }),
];

/**
 * Returns the best matching guide or FAQ, or null when the question is not a "how do I" one or no
 * entry covers every word of it - in which case the chat falls back to the AI.
 */
export function findHelpAnswer(message: string): HelpAnswer | null {
  if (!QUESTION_START.test(message)) return null;
  const tokens = meaningfulTokens(message);
  if (tokens.length === 0 || tokens.length > 8) return null;

  let best: { score: number; answer: HelpAnswer } | null = null;
  for (const entry of ENTRIES) {
    if (!tokens.every((t) => entry.all.has(t))) continue;
    const strongHits = tokens.filter((t) => entry.strong.has(t)).length;
    if (strongHits === 0) continue;
    const score = strongHits * 3 + (tokens.length - strongHits);
    if (!best || score > best.score) best = { score, answer: entry.answer };
  }
  return best?.answer ?? null;
}
