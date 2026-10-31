import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Download,
  Hash,
  ImageIcon,
  Link2,
  Maximize2,
  Minimize2,
  PenLine,
  RotateCcw,
  Send,
  Sparkles,
  Wand2,
  X,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  ApiError,
  CopilotLinkResult,
  ImageAspectRatio,
  MAX_COPILOT_LINKS,
  copilotReply,
  generateImage,
  getImageOptions,
} from '../lib/api';
import { findHelpAnswer } from '../lib/helpContent';
import { requestReuse } from '../lib/reuse';
import { VIEW_TITLES } from '../lib/viewTitles';
import VoiceInputButton, { appendSpoken } from './VoiceInputButton';

// "Create an image of...", "generate a poster for...", "/image sunset over Amritsar" - these go to
// Image Studio's generator instead of the text co-pilot.
const IMAGE_INTENT =
  /^\s*(?:\/image\b|(?:please\s+)?(?:(?:can|could) you\s+)?(?:create|generate|make|draw|design|paint|produce|give me|show me)\b[^.?!\n]{0,40}?\b(?:image|picture|photo|poster|logo|illustration|banner|graphic|thumbnail|artwork)\b)/i;

// Video and voice cost far more than text, so the chat points to their studios instead of running them blind.
const STUDIO_INTENTS: { test: RegExp; view: ViewType; label: string; reply: string }[] = [
  {
    test: /^\s*(?:please\s+)?(?:(?:can|could) you\s+)?(?:create|generate|make|produce|give me|show me)\b[^.?!\n]{0,40}?\b(?:video|reel|short|animation)\b/i,
    view: 'video-studio',
    label: 'Open Video Studio',
    reply: 'Videos are made in Video Studio, where you can pick the style, length and see the credit cost before you start.',
  },
  {
    test: /^\s*(?:please\s+)?(?:(?:can|could) you\s+)?(?:create|generate|make|produce|record|give me)\b[^.?!\n]{0,40}?\b(?:voiceover|voice-over|voice over|narration|audio|speech)\b/i,
    view: 'voice-studio',
    label: 'Open Voice Studio',
    reply: 'Voiceovers are made in Voice Studio, where you can choose the language and voice and hear it before saving.',
  },
];

// Ways to start, shown under the greeting until the first message.
const STARTERS: { icon: LucideIcon; label: string; text: string; withLink?: boolean }[] = [
  { icon: Link2, label: 'Make a picture like one I found', text: 'Make a picture like this one for my brand', withLink: true },
  { icon: PenLine, label: 'Write a LinkedIn post', text: 'Write a LinkedIn post about ' },
  { icon: ImageIcon, label: 'Create an image', text: 'Create an image of ' },
  { icon: Hash, label: 'Suggest hashtags', text: 'Suggest 10 hashtags for a post about ' },
  { icon: Youtube, label: '5 YouTube Short titles', text: 'Suggest 5 YouTube Short titles about ' },
  { icon: Wand2, label: 'Make my text punchy', text: 'Rewrite this to be short and punchy:\n' },
];

const SHAPE_LABEL: Record<ImageAspectRatio, string> = {
  '1:1': 'Square',
  '4:5': 'Portrait 4:5',
  '2:3': 'Portrait 2:3',
  '9:16': 'Tall 9:16',
  '16:9': 'Wide 16:9',
};

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
// A sentence often ends right after a link; that full stop or bracket is not part of the address.
const trimLink = (url: string) => url.replace(/[),.;:!?]+$/, '');

/** The links typed into a message, in order, without repeats. */
function findLinks(text: string): string[] {
  return [...new Set((text.match(URL_PATTERN) ?? []).map(trimLink))];
}

/** "media.licdn.com/…/1793242375638": enough to recognise a link without its 200-character tail. */
function shortLink(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) return host;
    return `${host}/${parts.length > 1 ? '…/' : ''}${last.length > 24 ? `${last.slice(0, 22)}…` : last}`;
  } catch {
    return url.length > 40 ? `${url.slice(0, 38)}…` : url;
  }
}

/** A pasted address as a full link ("licindia.in" becomes "https://licindia.in"), or null if it is not one. */
function normaliseLink(text: string): string | null {
  const value = text.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

const EXPANDED_KEY = 'lumora.copilot.expanded';

function readExpanded(): boolean {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

type ChatMessage = {
  sender: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  image?: string;
  link?: { view: ViewType; label: string };
  /** Answered from the built-in guides (free); holds the original question so it can be re-asked to the AI. */
  guideFor?: string;
  /** Links the person added with the link button (typed ones are already in the text). */
  attached?: string[];
  /** What happened to the links sent with the question. */
  linkResults?: CopilotLinkResult[];
  /** A ready-made image prompt the person can turn into a picture. */
  imagePrompt?: { text: string; aspectRatio: ImageAspectRatio };
};

/** A turn as the AI should see it again: with the links it was about and the image prompt it wrote. */
function historyText(m: ChatMessage): string {
  const parts = [m.text, ...(m.attached ?? [])];
  if (m.imagePrompt) parts.push(`IMAGE_PROMPT: ${m.imagePrompt.text}`);
  // The server takes up to 4,000 characters a turn.
  return parts.filter(Boolean).join('\n').slice(0, 4000);
}

/** Message text with its links clickable and shortened, so a long address cannot stretch the bubble. */
const LinkifiedText: React.FC<{ text: string; onDark: boolean }> = ({ text, onDark }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimLink(match[0]);
    const start = match.index ?? 0;
    parts.push(text.slice(last, start));
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noreferrer"
        title={url}
        className={`underline underline-offset-2 ${onDark ? 'text-white decoration-white/60' : 'text-blue-600 dark:text-blue-400'}`}
      >
        {shortLink(url)}
      </a>,
    );
    last = start + url.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

const HeaderButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({
  label,
  onClick,
  disabled,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-40 transition-colors"
  >
    {children}
  </button>
);

/** A link waiting to be sent: "attached" (link button) and "reading" (typed) are read; "skipped" is not. */
const LinkChip: React.FC<{ url: string; state: 'attached' | 'reading' | 'skipped'; onClick: () => void }> = ({
  url,
  state,
  onClick,
}) => {
  const skipped = state === 'skipped';
  const action = state === 'attached' ? 'Remove link' : skipped ? 'Read this link' : "Don't read this link";
  return (
    <span
      className={`inline-flex items-center gap-1 max-w-full pl-2 pr-0.5 py-0.5 rounded-full border text-[11px] ${
        skipped
          ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
          : 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
      }`}
    >
      <Link2 className="w-3 h-3 shrink-0" />
      <span className="truncate" title={url}>
        {skipped ? 'Not reading' : 'Will read'} <span className={skipped ? 'line-through' : 'font-medium'}>{shortLink(url)}</span>
      </span>
      <button
        type="button"
        onClick={onClick}
        title={action}
        aria-label={action}
        className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/60 shrink-0"
      >
        {skipped ? <RotateCcw className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </button>
    </span>
  );
};

interface FloatingAIAssistantProps {
  currentView: ViewType;
  onNavigate?: (view: ViewType) => void;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const greeting = (): ChatMessage => ({
    sender: 'assistant',
    text: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! I'm your Lumora Co-pilot. I can write and rewrite posts, suggest hooks and hashtags, explain how Lumora works, and read a picture or web page from a link to make a picture like it. Each reply uses 1 credit; pictures use image credits.`,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(readExpanded);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting()]);
  const [input, setInput] = useState('');
  /** What the Co-pilot is doing right now ("Thinking..."), or null when it is free. */
  const [busy, setBusy] = useState<string | null>(null);
  const [showLinkField, setShowLinkField] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkDraftError, setLinkDraftError] = useState<string | null>(null);
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [skippedLinks, setSkippedLinks] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const isTyping = busy !== null;
  const started = messages.some((m) => m.sender === 'user');
  const typedLinks = findLinks(input);
  const linksToRead = [...new Set([...attachedLinks, ...typedLinks.filter((url) => !skippedLinks.includes(url))])];
  const canSend = !isTyping && (input.trim().length > 0 || attachedLinks.length > 0);
  const screenTitle = VIEW_TITLES[currentView]?.title;

  // Keep the newest message in view. A new answer is read from its start (a description, then the image prompt
  // card), so it scrolls to the answer's top; anything else, like the person's own message, to the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const answer = !busy && messages[messages.length - 1]?.sender === 'assistant' ? lastMessageRef.current : null;
    list.scrollTo({ top: answer ? answer.offsetTop - 12 : list.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, isOpen, expanded]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen, expanded]);

  // The box grows with what is typed, up to about six lines, then scrolls.
  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 160)}px`;
  }, [input, isOpen, expanded]);

  const setExpandedPref = (value: boolean) => {
    setExpanded(value);
    try {
      window.localStorage.setItem(EXPANDED_KEY, value ? '1' : '0');
    } catch {
      // Storage blocked: the size just isn't remembered.
    }
  };

  const focusInputAtEnd = () =>
    window.requestAnimationFrame(() => {
      const box = inputRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    });

  const newChat = () => {
    setMessages([greeting()]);
    setInput('');
    setAttachedLinks([]);
    setSkippedLinks([]);
    setShowLinkField(false);
    focusInputAtEnd();
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      // Clipboard blocked by the browser: nothing to copy into.
    }
  };

  const toggleLinkField = () => {
    const opening = !showLinkField;
    setShowLinkField(opening);
    setLinkDraftError(null);
    if (opening) window.requestAnimationFrame(() => linkInputRef.current?.focus());
  };

  const addLink = () => {
    const url = normaliseLink(linkDraft);
    if (!url) {
      setLinkDraftError('That does not look like a link. Paste the full address, starting with https://');
      return;
    }
    setAttachedLinks((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setLinkDraft('');
    setLinkDraftError(null);
    setShowLinkField(false);
    focusInputAtEnd();
  };

  const pickStarter = (starter: (typeof STARTERS)[number]) => {
    setInput(starter.text);
    if (starter.withLink) {
      setShowLinkField(true);
      window.requestAnimationFrame(() => linkInputRef.current?.focus());
    } else {
      focusInputAtEnd();
    }
  };

  const openInImageStudio = (prompt: string) => {
    requestReuse({ studio: 'image', prompt });
    onNavigate?.('image-studio');
    setIsOpen(false);
  };

  const createImage = async (prompt: string, aspectRatio: ImageAspectRatio) => {
    setBusy('Creating your image… this can take up to a minute');
    try {
      const { providers } = await getImageOptions();
      const provider = providers.find((p) => p.configured) ?? providers.find((p) => p.recommended) ?? providers[0];
      if (!provider) throw new Error('No image provider is set up on this server.');
      const quality = provider.qualities.find((q) => q.id === 'standard')?.id ?? provider.qualities[0]?.id;
      const result = await generateImage({
        prompt,
        provider: provider.id,
        quality,
        aspectRatio,
        count: 1,
        saveToGallery: true,
      });
      const image = result.images[0];
      if (!image) throw new ApiError(502, 'The image provider returned no image.');
      const cost = result.creditsUsed ? ` Used ${result.creditsUsed} credit${result.creditsUsed === 1 ? '' : 's'}; it is saved in your Gallery.` : ' It is saved in your Gallery.';
      setMessages((prev) => [...prev, { sender: 'assistant', text: `Here's your image.${cost}`, image, link: { view: 'image-studio', label: 'Open Image Studio' } }]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 402
          ? 'Not enough credits to create an image.'
          : err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Something went wrong.';
      setMessages((prev) => [...prev, { sender: 'assistant', isError: true, text: `${message} No credit was charged.` }]);
    } finally {
      setBusy(null);
    }
  };

  const send = async (userMsg: string, options: { skipGuide?: boolean; links?: string[] } = {}) => {
    const links = options.links ?? [];
    // The greeting, error bubbles and guide/link/image answers are UI, not conversation - only real turns are sent back.
    const history = messages
      .slice(1)
      .filter((m) => !m.isError && !m.image && !m.link && !m.guideFor)
      .slice(-8)
      .map((m) => ({ role: m.sender, text: historyText(m) }));
    // Re-asking the AI after a guide answer: the question is already the last turn, so don't send it twice.
    if (options.skipGuide && history[history.length - 1]?.text === userMsg) history.pop();
    if (!options.skipGuide) {
      const attached = links.filter((url) => !userMsg.includes(url));
      setMessages((prev) => [...prev, { sender: 'user', text: userMsg, ...(attached.length ? { attached } : {}) }]);
    }

    // With a link the person wants it read, so the free shortcuts below (which cannot read links) are skipped.
    const shortcuts = links.length === 0;

    // "How do I...?" questions are answered from the built-in guides: instant, and no credit or AI call.
    const guide = options.skipGuide || !shortcuts ? null : findHelpAnswer(userMsg);
    if (guide) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `${guide.title}\n${guide.text}`,
          guideFor: userMsg,
          link: guide.view && guide.action ? { view: guide.view, label: guide.action } : undefined,
        },
      ]);
      return;
    }

    const studio = shortcuts ? STUDIO_INTENTS.find((s) => s.test.test(userMsg)) : undefined;
    if (studio) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: studio.reply, link: { view: studio.view, label: studio.label } },
      ]);
      return;
    }

    if (shortcuts && IMAGE_INTENT.test(userMsg)) {
      await createImage(userMsg.replace(/^\s*\/image\s*/i, '').trim(), '1:1');
      return;
    }

    setBusy(links.length ? `Reading the link${links.length > 1 ? 's' : ''}…` : 'Thinking…');
    try {
      const result = await copilotReply({ message: userMsg, screen: currentView, history, ...(links.length ? { links } : {}) });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: result.reply || 'I could not come up with a reply. Please try again.',
          ...(result.links?.length ? { linkResults: result.links } : {}),
          ...(result.imagePrompt
            ? { imagePrompt: { text: result.imagePrompt, aspectRatio: result.imageAspectRatio ?? '1:1' } }
            : {}),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          isError: true,
          text: `${err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong.'} No credit was charged.`,
        },
      ]);
    } finally {
      setBusy(null);
    }
  };

  const submit = () => {
    if (!canSend) return;
    const text = input.trim();
    const links = linksToRead.slice(0, MAX_COPILOT_LINKS);
    setInput('');
    setAttachedLinks([]);
    setSkippedLinks([]);
    setShowLinkField(false);
    setLinkDraft('');
    void send(text || 'What does this show?', { links });
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (expanded) setExpandedPref(false);
    else setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-[4.5rem] lg:bottom-6 right-4 lg:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Lumora Co-pilot"
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-xs shadow-xl shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all group"
        >
          <div className="p-1 rounded-full bg-white/20 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:inline font-semibold">Lumora Co-pilot</span>
        </button>
      </div>
    );
  }

  const textSize = expanded ? 'text-sm' : 'text-[13px]';
  const column = expanded ? 'mx-auto w-full max-w-3xl' : 'w-full';

  const panel = (
    <div
      role="dialog"
      aria-label="Lumora Co-pilot"
      onKeyDown={onPanelKeyDown}
      className={`flex flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in duration-200 ${
        expanded
          ? 'w-full h-full sm:h-[min(880px,100%)] sm:max-w-5xl sm:rounded-2xl sm:border border-slate-200 dark:border-slate-800'
          : 'w-[calc(100vw-2rem)] sm:w-[400px] h-[min(620px,calc(100dvh-6.5rem))] rounded-2xl border border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-white/20 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-tight">Lumora Co-pilot</h2>
            <p className="text-[11px] text-blue-100 truncate">
              {screenTitle ? `On ${screenTitle} · ` : ''}1 credit a reply
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {started && (
            <HeaderButton label="New chat" onClick={newChat} disabled={isTyping}>
              <RotateCcw className="w-4 h-4" />
            </HeaderButton>
          )}
          <HeaderButton label={expanded ? 'Restore size' : 'Maximize'} onClick={() => setExpandedPref(!expanded)}>
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </HeaderButton>
          <HeaderButton label="Close" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </HeaderButton>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scroll">
        <div className={`${column} ${textSize} space-y-3 p-3 sm:p-4`}>
          {messages.map((m, idx) => {
            const mine = m.sender === 'user';
            const replyKey = `reply-${idx}`;
            const promptKey = `prompt-${idx}`;
            return (
              <div
                key={idx}
                ref={idx === messages.length - 1 ? lastMessageRef : undefined}
                className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] min-w-0 rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                    mine
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : m.isError
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200/80 dark:border-red-900/60 rounded-bl-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-bl-md'
                  }`}
                >
                  {m.image && (
                    <div className="mb-2">
                      <img
                        src={m.image}
                        alt="Generated"
                        className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 ${expanded ? 'max-w-md' : ''}`}
                      />
                      <a
                        href={m.image}
                        download="lumora-image.png"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  )}
                  <LinkifiedText text={m.text} onDark={mine} />
                  {m.attached && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {m.attached.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          title={url}
                          className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[11px] text-white"
                        >
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{shortLink(url)}</span>
                        </a>
                      ))}
                    </span>
                  )}
                  {m.link && onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(m.link!.view);
                        setIsOpen(false);
                      }}
                      className="mt-2 block px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors"
                    >
                      {m.link.label} →
                    </button>
                  )}
                  {m.guideFor && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>From the Lumora guide - free.</span>
                      <button
                        type="button"
                        disabled={isTyping}
                        onClick={() => void send(m.guideFor!, { skipGuide: true })}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      >
                        Ask AI instead (1 credit)
                      </button>
                    </div>
                  )}
                </div>

                {m.linkResults && (
                  <ul className="mt-1.5 max-w-[88%] space-y-1 text-[11px] leading-snug">
                    {m.linkResults.map((r) => (
                      <li
                        key={r.url}
                        className={`flex items-start gap-1.5 ${r.error ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        {r.error ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                        ) : (
                          <Check className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                          {r.error
                            ? `Couldn't open ${shortLink(r.url)}: ${r.error} If it needs a sign-in (LinkedIn posts do), right-click the picture, choose "Copy image address" and paste that link instead.`
                            : r.kind === 'picture'
                              ? `Read the picture at ${shortLink(r.url)}`
                              : `Read the page ${r.title ? `"${r.title}"` : shortLink(r.url)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {m.imagePrompt && (
                  <div className={`mt-2 w-full ${expanded ? 'max-w-[88%]' : ''} rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/70 dark:bg-indigo-950/30 p-3`}>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Image prompt
                      </span>
                      <span className="font-medium text-indigo-600/80 dark:text-indigo-300/80">
                        {SHAPE_LABEL[m.imagePrompt.aspectRatio]}
                      </span>
                    </div>
                    <p className="mt-1.5 text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {m.imagePrompt.text}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isTyping}
                        onClick={() => void createImage(m.imagePrompt!.text, m.imagePrompt!.aspectRatio)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Create image
                      </button>
                      {/* Image Studio reads the prompt when it opens, so this is offered only from other screens. */}
                      {onNavigate && currentView !== 'image-studio' && (
                        <button
                          type="button"
                          onClick={() => openInImageStudio(m.imagePrompt!.text)}
                          className="px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:border-indigo-400 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors"
                        >
                          Edit in Image Studio
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void copy(promptKey, m.imagePrompt!.text)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 text-xs font-medium transition-colors"
                      >
                        {copied === promptKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === promptKey ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Uses image credits. The picture is saved to your Gallery.
                    </p>
                  </div>
                )}

                {!mine && idx > 0 && !m.isError && (
                  <button
                    type="button"
                    onClick={() => void copy(replyKey, m.text)}
                    className="mt-1 ml-1 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    {copied === replyKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === replyKey ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            );
          })}

          {!started && (
            <div className={`grid gap-2 pt-1 ${expanded ? 'sm:grid-cols-2' : ''}`}>
              {STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => pickStarter(starter)}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <starter.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{starter.label}</span>
                </button>
              ))}
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400" aria-live="polite">
              <span className="flex items-center gap-1 px-3 py-3 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              {busy}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pt-2.5 pb-3">
        <div className={column}>
          {(attachedLinks.length > 0 || typedLinks.length > 0) && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {attachedLinks.map((url) => (
                <LinkChip
                  key={url}
                  url={url}
                  state="attached"
                  onClick={() => setAttachedLinks((prev) => prev.filter((u) => u !== url))}
                />
              ))}
              {typedLinks
                .filter((url) => !attachedLinks.includes(url))
                .map((url) => {
                  const skipped = skippedLinks.includes(url);
                  return (
                    <LinkChip
                      key={url}
                      url={url}
                      state={skipped ? 'skipped' : 'reading'}
                      onClick={() =>
                        setSkippedLinks((prev) => (skipped ? prev.filter((u) => u !== url) : [...prev, url]))
                      }
                    />
                  );
                })}
              {linksToRead.length > MAX_COPILOT_LINKS && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  Only the first {MAX_COPILOT_LINKS} links are read.
                </span>
              )}
            </div>
          )}

          {showLinkField && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5">
                <input
                  ref={linkInputRef}
                  type="url"
                  inputMode="url"
                  value={linkDraft}
                  onChange={(e) => {
                    setLinkDraft(e.target.value);
                    setLinkDraftError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLink();
                    } else if (e.key === 'Escape') {
                      e.stopPropagation();
                      setShowLinkField(false);
                      inputRef.current?.focus();
                    }
                  }}
                  placeholder="Paste a link to a picture or web page"
                  aria-label="Link to read"
                  className="flex-1 min-w-0 text-[13px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none border border-transparent focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addLink}
                  disabled={!linkDraft.trim()}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  Add
                </button>
              </div>
              <p
                className={`mt-1 text-[11px] leading-snug ${linkDraftError ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {linkDraftError ??
                  'Co-pilot opens the link and reads the picture or page. For a LinkedIn post, right-click its picture, choose "Copy image address" and paste that.'}
              </p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 pl-1.5 pr-1 py-1 transition"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={linksToRead.length ? 'What should I do with this link?' : 'Ask Co-pilot anything...'}
              aria-label="Message to Co-pilot"
              className={`flex-1 min-w-0 resize-none bg-transparent px-1.5 py-1.5 leading-5 text-slate-900 dark:text-white placeholder-slate-400 outline-none custom-scroll ${textSize}`}
            />
            <button
              type="button"
              onClick={toggleLinkField}
              aria-pressed={showLinkField}
              title="Read a link (picture or web page)"
              aria-label="Read a link"
              className={`p-2 rounded-xl transition-colors ${
                showLinkField
                  ? 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700'
              }`}
            >
              <Link2 className="w-4 h-4" />
            </button>
            <div className="self-end pb-[3px]">
              <VoiceInputButton
                compact
                currentText={input}
                onText={(spoken) => setInput((prev) => appendSpoken(prev, spoken))}
                onReplace={setInput}
              />
            </div>
            <button
              type="submit"
              disabled={!canSend}
              title="Send"
              aria-label="Send"
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="hidden sm:block mt-1.5 text-center text-[10px] text-slate-400 dark:text-slate-500">
            Enter to send · Shift+Enter for a new line · Esc to {expanded ? 'restore the size' : 'close'}
          </p>
        </div>
      </div>
    </div>
  );

  return expanded ? (
    // Clicking outside a maximized chat brings it back to its corner rather than closing it.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setExpandedPref(false);
      }}
    >
      {panel}
    </div>
  ) : (
    <div className="fixed bottom-[4.5rem] lg:bottom-6 right-4 lg:right-6 z-40">{panel}</div>
  );
};
