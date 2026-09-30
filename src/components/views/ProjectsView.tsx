import React, { useEffect, useState } from 'react';
import { FolderKanban, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Campaign, Project, ProjectStatus, ViewType } from '../../types';
import { createProject, deleteProject, listCampaigns, listProjects, updateProject } from '../../lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS, PROJECT_STATUS_STYLES } from '../../lib/projectDisplay';

interface ProjectsViewProps {
  onNavigate: (view: ViewType) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [p, c] = await Promise.all([listProjects(), listCampaigns()]);
      setProjects(p.items);
      setCampaigns(c.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const campaignName = (id: string | null) => campaigns.find((c) => c.id === id)?.name ?? 'None';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createProject({
        title,
        category: category || undefined,
        campaignId: campaignId || undefined,
      });
      setTitle('');
      setCategory('');
      setCampaignId('');
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    setProjects((prev) => prev?.map((p) => (p.id === id ? { ...p, status } : p)) ?? prev);
    try {
      await updateProject(id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev?.filter((p) => p.id !== id) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const filtered = (projects ?? []).filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      campaignName(p.campaignId).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Content Projects Workspace
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize multi-asset campaigns, social launches, and brand initiatives.
          </p>
        </div>

        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Project
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 md:col-span-2">
            Title
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q4 Product Launch"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Category
            <input
              maxLength={100}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Product Launch"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Campaign
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
            >
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter projects by title or campaign..."
          className="flex-1 text-xs bg-transparent text-slate-900 dark:text-white outline-none"
        />
      </div>

      {projects === null && !error ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {projects?.length ? 'No projects match your filter' : 'No projects yet'}
          </p>
          {!projects?.length && (
            <p className="text-xs text-slate-500 mt-1">
              Create your first project, then generate content for it in{' '}
              <button onClick={() => onNavigate('ai-studio')} className="text-blue-600 dark:text-blue-400 hover:underline">
                AI Studio
              </button>
              .
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {proj.category}
                </span>
                <button
                  onClick={() => handleDelete(proj.id)}
                  aria-label="Delete project"
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{proj.title}</h3>

              <p className="text-xs text-slate-500">Campaign: {campaignName(proj.campaignId)}</p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                <select
                  value={proj.status}
                  onChange={(e) => handleStatusChange(proj.id, e.target.value as ProjectStatus)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold outline-none cursor-pointer ${PROJECT_STATUS_STYLES[proj.status]}`}
                >
                  {PROJECT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {PROJECT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
