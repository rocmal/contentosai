import { BadRequestException } from '@nestjs/common';
import { HTML_TYPE, ReadLimit, fetchPublicResource } from '../../infrastructure/safe-http-fetch';
import { PreparedPicture, preparePicture } from '../../infrastructure/picture-input';
import { extractPageSignals } from '../content-studio/html-signals';

// Some servers label pictures as generic downloads; preparePicture reads the format from the bytes.
const PICTURE_TYPE = /^image\/|^application\/octet-stream|^binary\/octet-stream/i;
// Two pictures this size stay well inside Gemini's 20 MB request limit once base64-encoded.
const MAX_PICTURE_BYTES = 6_000_000;
const MAX_PAGE_BYTES = 1_500_000;
const PAGE_TEXT_CHARS = 4000;

export interface ReadLink {
  kind: 'picture' | 'page';
  /** The page's title; '' for a picture. */
  title: string;
  /** The page's description and visible text, shortened; '' for a picture. */
  text: string;
  /** The picture itself, or the page's preview picture when it has one that could be read. */
  picture: PreparedPicture | null;
}

export type LinkOutcome = { url: string; read: ReadLink } | { url: string; error: string };

/** Reads every link at once. A link that cannot be read is reported with the reason, never thrown, so one bad
 * link does not cost the person their answer. */
export function readLinks(urls: string[]): Promise<LinkOutcome[]> {
  return Promise.all(
    urls.map(async (url): Promise<LinkOutcome> => {
      try {
        return { url, read: await readLink(url) };
      } catch (err) {
        return {
          url,
          error: err instanceof BadRequestException ? err.message : 'Could not open that link.',
        };
      }
    }),
  );
}

const pictureLimit = (type: string): ReadLimit | null =>
  PICTURE_TYPE.test(type) || !type ? { maxBytes: MAX_PICTURE_BYTES, whenOver: 'refuse' } : null;

async function readLink(url: string): Promise<ReadLink> {
  const resource = await fetchPublicResource(url, {
    accept: 'text/html,application/xhtml+xml,image/png,image/jpeg,image/webp,image/gif,*/*;q=0.5',
    limitFor: (type) =>
      HTML_TYPE.test(type)
        ? { maxBytes: MAX_PAGE_BYTES, whenOver: 'truncate' }
        : (pictureLimit(type) ?? { refuse: 'That link is not a picture or a web page.' }),
  });
  if (!HTML_TYPE.test(resource.contentType)) {
    return { kind: 'picture', title: '', text: '', picture: preparePicture(resource.body) };
  }
  const page = extractPageSignals(resource.body.toString('utf8'), PAGE_TEXT_CHARS);
  return {
    kind: 'page',
    title: page.title,
    text: [page.description, page.text].filter(Boolean).join('\n'),
    picture: page.image ? await previewPicture(page.image, resource.finalUrl) : null,
  };
}

/** A shared post or article names its main picture in og:image. If it cannot be read the page text still is. */
async function previewPicture(src: string, pageUrl: string): Promise<PreparedPicture | null> {
  try {
    const picture = await fetchPublicResource(new URL(src, pageUrl).toString(), {
      accept: 'image/png,image/jpeg,image/webp,image/gif',
      limitFor: (type) => pictureLimit(type) ?? { refuse: 'not a picture' },
    });
    return preparePicture(picture.body);
  } catch {
    return null;
  }
}
