/**
 * LinkedIn reads a post's text ("commentary") as its "little text" format, where \ | { } @ [ ] ( ) < > # * _ ~ are
 * markup. Unescaped, a bracket or an @ can cut the post short or make LinkedIn refuse it, so every such character is
 * escaped with a backslash - except a hashtag ("#term", after a space or at the start), which becomes LinkedIn's
 * hashtag template so it still links.
 */
const RESERVED = /[\\|{}@[\]()<>#*_~]/g;
// \p{M} keeps Indian-language vowel signs (marks, not letters) inside the tag: #बीमा.
const HASHTAG = /(^|\s)#([\p{L}\p{M}\p{N}]+)/gu;

const escapeLittleText = (text: string): string => text.replace(RESERVED, (char) => `\\${char}`);

export function toLinkedInCommentary(text: string): string {
  let result = '';
  let last = 0;
  for (const match of text.matchAll(HASHTAG)) {
    const hash = (match.index ?? 0) + match[1].length;
    result += escapeLittleText(text.slice(last, hash)) + `{hashtag|\\#|${match[2]}}`;
    last = hash + 1 + match[2].length;
  }
  return result + escapeLittleText(text.slice(last));
}
