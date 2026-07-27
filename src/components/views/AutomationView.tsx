import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  Plus,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ViewType, WorkflowNode } from '../../types';

interface AutomationViewProps {
  nodes: WorkflowNode[];
  onNavigate: (view: ViewType) => void;
}

export const AutomationView: React.FC<AutomationViewProps> = ({ nodes: initialNodes, onNavigate }) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleRunWorkflow = () => {
    setIsRunning(true);
    setLogs(['🚀 Starting Lumora Automated Workflow Execution...']);

    setTimeout(() => {
      setLogs((prev) => [...prev, '⚡ [1/4] Trigger: RSS Trend feed pulled 3 viral AI topics']);
    }, 800);

    setTimeout(() => {
      setLogs((prev) => [...prev, '🧠 [2/4] Brand Brain: Injected tone pillars & product guidelines']);
    }, 1600);

    setTimeout(() => {
      setLogs((prev) => [...prev, '✨ [3/4] Gemini 3.6: Generated LinkedIn Post & YouTube Short script']);
    }, 2400);

    setTimeout(() => {
      setLogs((prev) => [...prev, '✅ [4/4] Publish: Scheduled 2 posts to Content Calendar']);
      setIsRunning(false);
    }, 3200);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              n8n-Inspired Workflow Automation Canvas
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build autonomous background workflows connecting AI models, Brand Brain, and publishing channels.
          </p>
        </div>

        <button
          onClick={handleRunWorkflow}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running Workflow...' : 'Execute Test Workflow'}</span>
        </button>
      </div>

      {/* Visual Canvas Board */}
      <div className="p-6 md:p-8 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden min-h-[420px]">
        {/* Subtle grid dots background */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <div className="w-full md:w-56 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 transition-all shadow-lg space-y-2 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                    {node.type}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                  {node.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {node.description}
                </p>
              </div>

              {index < nodes.length - 1 && (
                <div className="hidden md:flex items-center justify-center text-slate-600">
                  <ArrowRight className="w-5 h-5 text-blue-500 animate-pulse" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Execution Terminal Logs Output */}
      {logs.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 space-y-2 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Workflow Execution Terminal Log</span>
            <span>Status: {isRunning ? 'EXECUTING' : 'SUCCESS'}</span>
          </div>
          {logs.map((log, i) => (
            <div key={i} className="animate-in fade-in leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
