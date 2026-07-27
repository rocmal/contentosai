import React, { useState } from 'react';
import { Layers, Power } from 'lucide-react';
import { ViewType } from '../../types';

interface IntegrationsViewProps {
  onNavigate: (view: ViewType) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ onNavigate }) => {
  const [integrations, setIntegrations] = useState([
    { id: 'gemini', name: 'Gemini 3.6 Flash API', category: 'AI Engine', connected: true },
    { id: 'openai', name: 'OpenAI GPT-4o', category: 'AI Engine', connected: true },
    { id: 'elevenlabs', name: 'ElevenLabs Voice', category: 'Audio Synthesis', connected: true },
    { id: 'linkedin', name: 'LinkedIn Company Page', category: 'Publishing', connected: true },
    { id: 'youtube', name: 'YouTube Studio API', category: 'Publishing', connected: true },
    { id: 'slack', name: 'Slack Notifications', category: 'Operations', connected: false },
    { id: 'hubspot', name: 'HubSpot CRM', category: 'Lead Gen', connected: false },
    { id: 'stripe', name: 'Stripe Billing API', category: 'Finance', connected: true },
  ]);

  const toggle = (id: string) => {
    setIntegrations(
      integrations.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Connected APIs & Publishing Integrations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Connect AI model providers, social publishing accounts, and CRM webhooks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{item.category}</span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h3>
            </div>

            <button
              onClick={() => toggle(item.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                item.connected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{item.connected ? 'Connected' : 'Connect'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
