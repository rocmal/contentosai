/** Ready-made starting prompts for Video Studio. Each is written the way the video model
 * likes: one clear subject, the setting, the camera move, the light and the mood. They
 * avoid on-screen lettering (AI video garbles it - add your wording in the editor step)
 * and, for the insurance ones, avoid returns, guarantees or claims. */
export interface VideoPromptTemplate {
  id: string;
  category: string;
  title: string;
  prompt: string;
  /** One of the format ids in Video Studio (cinematic, social-reel, square-post, explainer, product-ad). */
  presetId: string;
}

export const VIDEO_PROMPT_CATEGORIES = [
  'Insurance & finance',
  'Festivals & greetings',
  'Local business',
  'Education',
  'Health & fitness',
  'Real estate',
] as const;

export const VIDEO_PROMPT_TEMPLATES: VideoPromptTemplate[] = [
  // Insurance & finance
  {
    id: 'ins-family-protection',
    category: 'Insurance & finance',
    title: 'Family protection',
    presetId: 'social-reel',
    prompt:
      'A happy Indian family of four having breakfast together in a bright, sunlit kitchen, the parents smiling at their two children. Slow gentle push-in, warm morning light, soft focus background, natural home sounds and light laughter. Calm, reassuring, trustworthy mood.',
  },
  {
    id: 'ins-advisor-meeting',
    category: 'Insurance & finance',
    title: 'Advisor meeting a family',
    presetId: 'explainer',
    prompt:
      'A friendly Indian woman insurance advisor in a smart blue blazer sits at a neat desk and explains a plan to a young couple, using a folder and gentle hand gestures. Medium shot, soft office daylight, shallow depth of field, quiet office ambience. Professional, warm and honest tone.',
  },
  {
    id: 'ins-child-future',
    category: 'Insurance & finance',
    title: "Child's future",
    presetId: 'cinematic',
    prompt:
      'A father lifts his young daughter on his shoulders in a green park at golden hour, both laughing, the sun flaring behind them. Slow-motion tracking shot, cinematic warm colours, birdsong and distant children playing. Hopeful, emotional mood.',
  },
  {
    id: 'ins-retirement',
    category: 'Insurance & finance',
    title: 'Peaceful retirement',
    presetId: 'cinematic',
    prompt:
      'An elderly Indian couple sit on a balcony with tea at sunrise, looking at the city waking up and smiling at each other. Slow pull-back from a close-up of their hands to a wide view, soft golden light, gentle morning sounds. Peaceful, content mood.',
  },
  // Festivals & greetings
  {
    id: 'fest-diwali',
    category: 'Festivals & greetings',
    title: 'Diwali greeting',
    presetId: 'social-reel',
    prompt:
      'Rows of glowing diyas and marigold rangoli on a doorstep at dusk, a hand lighting one more diya, sparkling fairy lights and fireworks blooming softly in the background. Slow upward camera tilt, rich orange and gold colours, soft festive music and a distant firecracker. Joyful and warm.',
  },
  {
    id: 'fest-holi',
    category: 'Festivals & greetings',
    title: 'Holi colours',
    presetId: 'social-reel',
    prompt:
      'Friends laughing and throwing bright pink, yellow and blue gulal powder into the air in a sunny courtyard, colours exploding in slow motion. Handheld energetic camera, saturated vibrant colours, cheerful crowd sounds and drums. Playful and full of joy.',
  },
  {
    id: 'fest-raksha',
    category: 'Festivals & greetings',
    title: 'Raksha Bandhan',
    presetId: 'square-post',
    prompt:
      'A sister ties a decorated rakhi on her brother\'s wrist at a table with sweets and a lit diya, both smiling. Close-up on the hands then a gentle pull-back, soft warm indoor light, gentle festive tune. Tender and loving mood.',
  },
  // Local business
  {
    id: 'biz-restaurant',
    category: 'Local business',
    title: 'Restaurant dish reveal',
    presetId: 'product-ad',
    prompt:
      'A chef plates a steaming Indian thali with butter naan, paneer curry and fresh garnish on a dark wooden table, steam rising in the light. Slow macro dolly across the dish, moody warm lighting, sizzling and cutlery sounds. Appetising, premium feel.',
  },
  {
    id: 'biz-shop',
    category: 'Local business',
    title: 'Shop opening',
    presetId: 'social-reel',
    prompt:
      'A shopkeeper in a small neat Indian store lifts the shutter in the morning, switches on the lights and welcomes the first customer with a smile. Smooth handheld follow shot, bright morning light spilling in, street sounds fading to a friendly greeting. Welcoming, local, trustworthy.',
  },
  {
    id: 'biz-product',
    category: 'Local business',
    title: 'Product showcase',
    presetId: 'product-ad',
    prompt:
      'A premium product on a clean pedestal rotating slowly on a soft grey studio backdrop, light sweeping across its surface to show detail. Smooth orbit camera, softbox lighting, subtle reflections, quiet modern background music. Clean, high-end commercial look.',
  },
  // Education
  {
    id: 'edu-classroom',
    category: 'Education',
    title: 'Curious classroom',
    presetId: 'explainer',
    prompt:
      'Students in a bright classroom lean forward as a teacher draws a simple diagram on the board, one student raises a hand with a smile. Gentle side-tracking shot, natural window light, soft classroom murmur. Encouraging, curious mood.',
  },
  {
    id: 'edu-study',
    category: 'Education',
    title: 'Focused study',
    presetId: 'square-post',
    prompt:
      'A student studies at a desk with a lamp, notebooks and a cup of tea late in the evening, turning a page and nodding as an idea clicks. Slow push-in, warm lamp light against a dark window, quiet room tone and a soft clock tick. Determined, calm mood.',
  },
  // Health & fitness
  {
    id: 'fit-yoga',
    category: 'Health & fitness',
    title: 'Sunrise yoga',
    presetId: 'cinematic',
    prompt:
      'A woman performs yoga on a rooftop at sunrise, moving from tree pose into a deep stretch while the city glows behind her. Slow wide tracking shot, soft golden-pink light and gentle mist, calm breathing and distant birds. Peaceful and energising.',
  },
  {
    id: 'fit-run',
    category: 'Health & fitness',
    title: 'Morning run',
    presetId: 'social-reel',
    prompt:
      'A man in running shoes jogs along a tree-lined road in early morning mist, sunlight breaking through the leaves. Low-angle tracking shot beside his feet then rising to his face, steady footsteps and breathing, crisp cool colours. Motivated, fresh mood.',
  },
  // Real estate
  {
    id: 're-home-tour',
    category: 'Real estate',
    title: 'Home walkthrough',
    presetId: 'cinematic',
    prompt:
      'A smooth gimbal walkthrough of a bright modern Indian apartment, from the entrance to a spacious living room with large windows, then a tidy kitchen and a balcony with a city view. Natural daylight, clean uncluttered rooms, soft footsteps and quiet ambience. Spacious, premium, inviting.',
  },
  {
    id: 're-new-home',
    category: 'Real estate',
    title: 'Getting the keys',
    presetId: 'square-post',
    prompt:
      'A couple opens the door of their new home for the first time, steps inside and looks around with delighted smiles, a hand holding up a set of keys. Slow push-in from behind, warm natural light, a happy gasp and soft music. Emotional and joyful.',
  },
];
