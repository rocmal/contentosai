import React, { useState } from 'react';
import { Bot, ChevronDown, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ApiError, copilotReply } from '../lib/api';
import VoiceInputButton, { appendSpoken } from './VoiceInputButton';

interface FloatingAIAssistantProps {
  currentView: ViewType;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ currentView }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'assistant'; text: string; isError?: boolean }[]>([
    {
      sender: 'assistant',
      text: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! I'm your Lumora Co-pilot. I can rewrite text, suggest hooks, plan content and explain how to use the platform. Each reply uses 1 credit. How can I help?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    // The greeting and any error bubbles are UI, not conversation - only real turns are sent back.
    const history = messages
      .slice(1)
      .filter((m) => !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.sender, text: m.text }));
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsTyping(true);

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
                  className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl px-3 py-2 text-[11px] animate-pulse">
                  Lumora Co-pilot is analyzing context...
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
