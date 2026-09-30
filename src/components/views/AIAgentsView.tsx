import React, { useEffect, useState } from 'react';
import { AlertCircle, Bot, Check, Clock, Copy, Loader2, Play } from 'lucide-react';
import { ViewType } from '../../types';
import {
  AgentRun,
  AgentSummary,
  ApiError,
  listAgentRuns,
  listAgents,
  runAgent,
  StudioLanguage,
} from '../../lib/api';

interface AIAgentsViewProps {
  onNavigate: (view: ViewType) => void;
}

const LANGUAGES: { id: StudioLanguage; label: string }[] = [
  { id: 'english', label: 'English' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'hinglish', label: 'Hinglish' },
  { id: 'punjabi', label: 'Punjabi' },
];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const AIAgentsView: React.FC<AIAgentsViewProps> = ({ onNavigate }) => {
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [history, setHistory] = useState<AgentRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AgentSummary | null>(null);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<StudioLanguage>('english');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentRun | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [a, h] = await Promise.all([listAgents(), listAgentRuns({ limit: 8 })]);
      setAgents(a);
      setHistory(h.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAgent = (agent: AgentSummary) => {
    setSelected(agent);
    setInput('');
    setResult(null);
    setRunError(null);
  };

  const handleRun = async () => {
    if (!selected) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      setResult(await runAgent(selected.id, { input, language }));
      await load();
    } catch (err) {
      setRunError(
        err instanceof ApiError || err instanceof Error ? err.message : 'The agent run failed. Please try again.',
      );
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agentName = (id: string) => agents?.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            <Bot className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">AI Agents</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Specialised assistants that work with your Brand Brain. Each run uses 1 credit, is saved to your history, and is
          never published automatically. Agents work from what you give them and general knowledge, not live web or
          analytics data.
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">{error}</div>
      )}

      {agents === null && !error ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(agents ?? []).map((agent) => (
            <div
              key={agent.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-4 shadow-sm transition-all flex flex-col justify-between ${
                selected?.id === agent.id
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
              }`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {agent.role}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{agent.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{agent.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  {agent.runCount === 0
                    ? 'Not run yet'
                    : `${agent.runCount} run${agent.runCount === 1 ? '' : 's'}${agent.lastRunAt ? ` - last ${timeAgo(agent.lastRunAt)}` : ''}`}
                </span>
                <button
                  onClick={() => openAgent(agent)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Use agent</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-[11px] text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>

          <textarea
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selected.inputHint}
            maxLength={8000}
            className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as StudioLanguage)}
              aria-label="Output language"
              className="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleRun}
              disabled={running || input.trim().length < 3}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {running ? 'Running...' : 'Run agent (1 credit)'}
            </button>
          </div>

          {runError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{runError} No credit is charged for a failed run.</span>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {result.complianceFlags && result.complianceFlags.length > 0 && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    result.complianceFlags.some((f) => f.severity === 'block')
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <p className="font-bold">
                    {result.agentId === 'compliance' ? 'Issues found in the submitted draft:' : 'Review before publishing:'}
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.complianceFlags.map((f, i) => (
                      <li key={i}>
                        {f.message} <span className="font-mono opacity-80">({f.match})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {result.provider} / {result.model}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{result.output}</div>
              </div>
              <p className="text-[11px] text-slate-400">
                Drafts still need your own review and any required approval before publishing. Turn a draft into a finished
                piece in{' '}
                <button onClick={() => onNavigate('ai-studio')} className="text-blue-600 dark:text-blue-400 hover:underline">
                  AI Studio
                </button>
                .
              </p>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Recent runs
          </h3>
          <div className="space-y-2">
            {history.map((run) => (
              <button
                key={run.id}
                onClick={() => {
                  const agent = agents?.find((a) => a.id === run.agentId) ?? null;
                  setSelected(agent);
                  setInput(run.input);
                  setResult(run);
                  setRunError(null);
                }}
                className="w-full text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{agentName(run.agentId)}</span>
                  <span className="text-[10px] text-slate-400">{timeAgo(run.createdAt)}</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{run.input}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
