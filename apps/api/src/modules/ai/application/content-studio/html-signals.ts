export interface PageSignals {
  title: string;
  description: string;
  siteName: string;
  themeColor: string;
  text: string;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decode(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m).trim();
}

function metaContent(html: string, attr: 'name' | 'property', key: string): string {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const keyMatch = tag.match(new RegExp(`${attr}\\s*=\\s*["']${key}["']`, 'i'));
    if (!keyMatch) continue;
    const content = tag.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i);
    if (content) return decode(content[1] ?? content[2] ?? '');
  }
  return '';
}

/** Pulls the facts a brand profile can be grounded in out of raw HTML: head
 * metadata plus the visible body copy (scripts, styles and page chrome
 * removed), truncated so the prompt stays small. */
export function extractPageSignals(html: string, maxTextChars = 6000): PageSignals {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' '));
  const themeColor = metaContent(html, 'name', 'theme-color');

  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const text = decode(body)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 2)
    .join('\n')
    .slice(0, maxTextChars);

  return {
    title,
    description: metaContent(html, 'name', 'description') || metaContent(html, 'property', 'og:description'),
    siteName: metaContent(html, 'property', 'og:site_name') || metaContent(html, 'property', 'og:title'),
    themeColor: /^#[0-9a-f]{3,8}$/i.test(themeColor) ? themeColor : '',
    text,
  };
}
