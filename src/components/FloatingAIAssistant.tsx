import React, { useState } from 'react';
import { Bot, Download, ImageIcon, Minimize2, Send, Sparkles } from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, copilotReply, generateImage, getImageOptions } from '../lib/api';
import { findHelpAnswer } from '../lib/helpContent';
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

type ChatMessage = {
  sender: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  image?: string;
  link?: { view: ViewType; label: string };
  /** Answered from the built-in guides (free); holds the original question so it can be re-asked to the AI. */
  guideFor?: string;
};

interface FloatingAIAssistantProps {
  currentView: ViewType;
  onNavigate?: (view: ViewType) => void;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! I'm your Lumora Co-pilot. I can rewrite text, suggest hooks, plan content and explain how to use the platform. Each text reply uses 1 credit. Ask me to "create an image of..." and I'll make one (uses image credits). How can I help?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMakingImage, setIsMakingImage] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setInput('');
    void send(userMsg);
  };

  const send = async (userMsg: string, options: { skipGuide?: boolean } = {}) => {
    // The greeting, error bubbles and guide/link/image answers are UI, not conversation - only real turns are sent back.
    const history = messages
      .slice(1)
      .filter((m) => !m.isError && !m.image && !m.link && !m.guideFor)
      .slice(-8)
      .map((m) => ({ role: m.sender, text: m.text }));
    // Re-asking the AI after a guide answer: the question is already the last turn, so don't send it twice.
    if (options.skipGuide && history[history.length - 1]?.text === userMsg) history.pop();
    if (!options.skipGuide) setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsTyping(true);

    // "How do I...?" questions are answered from the built-in guides: instant, and no credit or AI call.
    const guide = options.skipGuide ? null : findHelpAnswer(userMsg);
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
      setIsTyping(false);
      return;
    }

    const studio = STUDIO_INTENTS.find((s) => s.test.test(userMsg));
    if (studio) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: studio.reply, link: { view: studio.view, label: studio.label } },
      ]);
      setIsTyping(false);
      return;
    }

    if (IMAGE_INTENT.test(userMsg)) {
      setIsMakingImage(true);
      try {
        const prompt = userMsg.replace(/^\s*\/image\s*/i, '').trim();
        const { providers } = await getImageOptions();
        const provider = providers.find((p) => p.configured) ?? providers.find((p) => p.recommended) ?? providers[0];
        if (!provider) throw new Error('No image provider is set up on this server.');
        const quality = provider.qualities.find((q) => q.id === 'standard')?.id ?? provider.qualities[0]?.id;
        const result = await generateImage({
          prompt,
          provider: provider.id,
          quality,
          aspectRatio: '1:1',
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
        setIsMakingImage(false);
        setIsTyping(false);
      }
      return;
    }

    try {
      const { reply } = await copilotReply({ message: userMsg, screen: currentView, history });
      setMessages((prev) => [...prev, { sender: 'assistant', text: reply || 'I could not come up with a reply. Please try again.' }]);
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
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-40">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-xs shadow-xl shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all group"
        >
          <div className="p-1 rounded-full bg-white/20 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:inline font-semibold">Lumora Co-pilot</span>
        </button>
      )}

      {/* Expanded Chat Assistant Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[480px] animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/20">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-none">Lumora Co-pilot</h3>
                <p className="text-[10px] text-blue-100 opacity-90 mt-0.5">
                  Context: {currentView}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scroll text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  {m.image && (
                    <div className="mb-2">
                      <img src={m.image} alt="Generated" className="w-full rounded-xl border border-slate-200 dark:border-slate-700" />
                      <a
                        href={m.image}
                        download="lumora-image.png"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  )}
                  {m.text}
                  {m.link && onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(m.link!.view);
                        setIsOpen(false);
                      }}
                      className="mt-2 block px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold transition-colors"
                    >
                      {m.link.label} →
                    </button>
                  )}
                  {m.guideFor && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
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
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl px-3 py-2 text-[11px] animate-pulse">
                  {isMakingImage ? 'Creating your image... this can take up to a minute' : 'Lumora Co-pilot is analyzing context...'}
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Pill Chips */}
          <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            <button
              onClick={() => setInput('Rewrite this post to be punchy & viral')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 whitespace-nowrap"
            >
              ✨ Make punchy
            </button>
            <button
              onClick={() => setInput('Create an image of ')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 whitespace-nowrap inline-flex items-center gap-1"
            >
              <ImageIcon className="w-3 h-3" /> Create image
            </button>
            <button
              onClick={() => setInput('Suggest 5 YouTube Short titles')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 whitespace-nowrap"
            >
              📹 5 YouTube titles
            </button>
            <button
              onClick={() => setInput('Generate hashtags for Brand Brain')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 whitespace-nowrap"
            >
              # Hashtags
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Co-pilot anything..."
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none border border-transparent focus:border-blue-500"
            />
            <VoiceInputButton compact onText={(spoken) => setInput((prev) => appendSpoken(prev, spoken))} />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
