import React, { useEffect, useState } from 'react';
import { Loader2, Megaphone, Plus, X } from 'lucide-react';
import { Campaign, CampaignStatus, ViewType } from '../../types';
import { createCampaign, deleteCampaign, listCampaigns, updateCampaign } from '../../lib/api';

interface CampaignsViewProps {
  onNavigate: (view: ViewType) => void;
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  active: 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  archived: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
};

const STATUS_OPTIONS: CampaignStatus[] = ['draft', 'active', 'completed', 'archived'];

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return 'No dates set';
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (startDate && endDate) return `${fmt(startDate)} → ${fmt(endDate)}`;
  return fmt(startDate || endDate!);
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ onNavigate }) => {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const result = await listCampaigns();
      setCampaigns(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
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
      await createCampaign({
        name,
        description: description || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: CampaignStatus) => {
    setCampaigns((prev) => prev?.map((c) => (c.id === id ? { ...c, status } : c)) ?? prev);
    try {
      await updateCampaign(id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    setCampaigns((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    try {
      await deleteCampaign(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
      await load();
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Megaphone className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Multi-Channel Marketing Campaigns
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Orchestrate cross-platform product launches and content initiatives.
          </p>
        </div>

        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Campaign
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create campaign</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              placeholder="Q4 Product Launch"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
            Create campaign
          </button>
        </form>
      )}

      {campaigns === null ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          No campaigns yet. Create your first one to organize content around a launch or initiative.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <select
                  value={camp.status}
                  onChange={(e) => handleStatusChange(camp.id, e.target.value as CampaignStatus)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border-none outline-none cursor-pointer ${STATUS_STYLES[camp.status]}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(camp.id)}
                  className="text-[11px] text-slate-400 hover:text-red-500 font-semibold"
                >
                  Delete
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{camp.name}</h3>
              {camp.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{camp.description}</p>
              )}
              <p className="text-[11px] text-slate-400">{formatDateRange(camp.startDate, camp.endDate)}</p>

              <button
                onClick={() => onNavigate('ai-studio')}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Generate content for this campaign →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
