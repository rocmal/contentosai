import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { ViewType } from '../../types';
import {
  AutomationWorkflow,
  AutomationWorkflowStatus,
  createAutomationWorkflow,
  deleteAutomationWorkflow,
  listAutomationWorkflows,
  updateAutomationWorkflow,
} from '../../lib/api';

interface AutomationViewProps {
  onNavigate: (view: ViewType) => void;
}

export const AutomationView: React.FC<AutomationViewProps> = () => {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('content.approved');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setError(null);
    try {
      setWorkflows(await listAutomationWorkflows());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createAutomationWorkflow({ name, trigger });
      setName('');
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (wf: AutomationWorkflow) => {
    const next: AutomationWorkflowStatus = wf.status === 'active' ? 'inactive' : 'active';
    setWorkflows((prev) => prev?.map((w) => (w.id === wf.id ? { ...w, status: next } : w)) ?? prev);
    try {
      await updateAutomationWorkflow(wf.id, { status: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow');
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    setWorkflows((prev) => prev?.filter((w) => w.id !== id) ?? prev);
    try {
      await deleteAutomationWorkflow(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
      await load();
    }
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
              Automation Workflows
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define event triggers your team wants to automate. Execution isn't built yet - this
            registers the rule so it's ready once it is.
          </p>
        </div>

        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto-publish approved posts"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Trigger event</label>
              <input
                type="text"
                required
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="content.approved"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create workflow
          </button>
        </form>
      )}

      {workflows === null ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          No workflows yet. Create one to define an automation trigger.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(wf)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                    wf.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {wf.status}
                </button>
                <button
                  onClick={() => handleDelete(wf.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{wf.name}</h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                trigger: {wf.trigger}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
