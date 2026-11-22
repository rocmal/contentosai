/**
 * How to connect each publishing account, written for customers. One source for the public guide pages
 * (/guides/<id>, ConnectGuidePage) and the help icons next to each Connect button (ConnectHelp). Keep it true to the
 * screens: when a button or step changes, change it here.
 */
export type ConnectGuideId = 'linkedin' | 'facebook-instagram' | 'youtube';

export interface ConnectGuide {
  id: ConnectGuideId;
  /** Short name, e.g. for the guides list. */
  name: string;
  title: string;
  intro: string;
  needs: string[];
  /** The connect steps - also shown in the help icon's popover. */
  steps: string[];
  /** Extra setup some people need first (e.g. an Instagram professional account). */
  setup?: { title: string; steps: string[] };
  after: string[];
  problems: { q: string; a: string }[];
  /** A screen recording of the steps, once one exists (put the file in public/guides/ and set its path here). */
  videoUrl?: string;
}

export const SUPPORT_EMAIL = 'sales@lumoraos.in';

export const CONNECT_GUIDES: ConnectGuide[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    title: 'Connect your LinkedIn profile',
    intro:
      'Lumora posts to your personal LinkedIn profile - text, a picture or a video - now or at a date and time you pick.',
    needs: [
      'A LinkedIn account. Posts go to your personal profile; posting as a company Page is not available yet.',
      'Your Lumora account. Each workspace connects one LinkedIn profile.',
    ],
    steps: [
      'In Lumora, open Integrations (left menu, under Management).',
      'On the LinkedIn card, press Connect LinkedIn.',
      'Sign in to LinkedIn if asked - with the account you want to post from - and press Allow.',
      'You come back to Lumora and the card says Connected, with your name.',
    ],
    after: [
      'Post from LinkedIn Posts → New post, from a Gallery item (Post), or from Video Studio (Post to LinkedIn).',
      'Choose Post now, or Schedule and pick a date and time.',
      'LinkedIn ends every connection after 60 days. Lumora reminds you 7 days before; press Reconnect to carry on.',
    ],
    problems: [
      {
        q: 'It connected the wrong LinkedIn account.',
        a: 'Sign out of LinkedIn in your browser, then press Reconnect in Lumora and sign in with the right account.',
      },
      {
        q: 'The card says the connection has run out.',
        a: 'Press Reconnect. Scheduled posts keep their times; any that failed while it was out are under LinkedIn Posts → Failed, with Try again.',
      },
      {
        q: 'A post failed.',
        a: 'Open LinkedIn Posts → Failed. The reason is shown next to the post, with Try again.',
      },
    ],
  },
  {
    id: 'facebook-instagram',
    name: 'Facebook & Instagram',
    title: 'Connect Facebook and Instagram',
    intro:
      'Lumora posts videos to your Facebook Page, and as Reels to your Instagram account, now or at a date and time you pick. One connection covers both.',
    needs: [
      'A Facebook Page that you manage (with full control of the Page). Posts go to the Page, not your personal timeline.',
      'For Instagram: an Instagram professional account (Business or Creator) linked to that Facebook Page.',
    ],
    setup: {
      title: 'Instagram first time only: make it a professional account and link it to your Page',
      steps: [
        'In the Instagram app, open your profile → menu (☰) → Settings → Account type and tools → Switch to professional account, and pick Business or Creator.',
        'On Facebook, open your Page → Settings → Linked accounts → Instagram → Connect account, and sign in to that Instagram account.',
      ],
    },
    steps: [
      'In Lumora, open Integrations and press Connect Facebook & Instagram.',
      'Log in to Facebook with the account that manages your Page.',
      'When Facebook asks, choose your Page - and its Instagram account - and leave every permission switched on.',
      'Press Continue or Save. You come back to Lumora and the card says Connected, with your Page name.',
    ],
    after: [
      'Post from Facebook Posts or Instagram → New post, or from Video Studio (Post to Facebook / Post to Instagram).',
      'Both take videos. Instagram posts them as Reels; vertical 9:16 videos fill the screen.',
      'Choose Post now, or Schedule and pick a date and time.',
    ],
    problems: [
      {
        q: 'Facebook says the app is not available or not active.',
        a: `While Facebook reviews Lumora, accounts are switched on one by one. Email ${SUPPORT_EMAIL} and we will add yours.`,
      },
      {
        q: 'Lumora says Facebook did not share any Page.',
        a: 'You need to manage a Facebook Page. Connect again, and in the Facebook step open "Edit settings" (or "Choose what you allow") and tick your Page.',
      },
      {
        q: 'Facebook is connected but Instagram is not.',
        a: 'Instagram must be a professional account linked to the Page you chose (see the first-time steps above). Then press Connect Facebook & Instagram again.',
      },
      {
        q: 'A post failed.',
        a: 'Open Facebook Posts or Instagram → Failed. The reason is shown next to the post, with Try again.',
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    title: 'Connect your YouTube channel',
    intro:
      'Lumora uploads your videos to your YouTube channel - with a title, a description and who can see it - now or at a date and time you pick.',
    needs: ['A Google account with a YouTube channel.'],
    steps: [
      'In Lumora, open Integrations and press Connect YouTube.',
      'Choose the Google account that owns your channel, then the channel.',
      'Press Allow (or Continue). If Google warns that it has not verified the app yet, choose Advanced and continue to lumoraos.in.',
      'You come back to Lumora and the card says Connected, with your channel name.',
    ],
    after: [
      'Upload from YouTube → Upload video, from a Gallery video (the YouTube button), or from Video Studio (Upload to YouTube).',
      'Give it a title and description, choose who can see it, then upload now or schedule.',
    ],
    problems: [
      {
        q: 'Lumora says YouTube is not switched on for Lumora yet.',
        a: `YouTube is still being switched on for Lumora. Try again later, or email ${SUPPORT_EMAIL}.`,
      },
      {
        q: 'My video was uploaded as Private.',
        a: 'Until Google finishes reviewing Lumora, YouTube keeps uploads from new apps private. You can make it Public in YouTube Studio.',
      },
      {
        q: 'An upload failed.',
        a: 'Open YouTube → Failed. The reason is shown next to the upload, with Try again.',
      },
    ],
  },
];

export function connectGuide(id: ConnectGuideId): ConnectGuide {
  return CONNECT_GUIDES.find((g) => g.id === id) ?? CONNECT_GUIDES[0];
}

/** Public address of a guide; opens without signing in, so it can be sent to someone. */
export function guideUrl(id?: ConnectGuideId): string {
  return id ? `/guides/${id}` : '/guides';
}
