import React, { useState } from 'react';
import { Bot, CheckCircle2, Clock, Play, Power, Sparkles, Zap } from 'lucide-react';
import { AIAgent, ViewType } from '../../types';

interface AIAgentsViewProps {
  agents: AIAgent[];
  onNavigate: (view: ViewType) => void;
}

export const AIAgentsView: React.FC<AIAgentsViewProps> = ({ agents: initialAgents, onNavigate }) => {
  const [agents, setAgents] = useState<AIAgent[]>(initialAgents);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);

  const toggleAgent = (id: string) => {
    setAgents(
      agents.map((a) => (a.id === id ? { ...a, status: a.status === 'Active' ? 'Idle' : 'Active' } : a))
    );
  };

  const handleRunAgent = async (agent: AIAgent) => {
    setRunningAgentId(agent.id);
    try {
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, agentName: agent.name }),
      });
    } catch {
      // Handled
    } finally {
      setTimeout(() => setRunningAgentId(null), 1500);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Bot className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Autonomous AI Agent Fleet (10 Agents)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specialized background workers running continuous research, content creation, and publishing.
          </p>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const isRunning = runningAgentId === agent.id;
          return (
            <div
              key={agent.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:border-blue-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    {agent.role}
                  </span>
                  <button
                    onClick={() => toggleAgent(agent.id)}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      agent.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{agent.status}</span>
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{agent.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {agent.description}
                </p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 mt-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Task</span>
                  <p className="font-medium line-clamp-1">{agent.currentTask}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  {agent.tasksCompleted} tasks completed
                </span>
                <button
                  onClick={() => handleRunAgent(agent)}
                  disabled={isRunning}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 fill-current ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Running...' : 'Trigger Task'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
