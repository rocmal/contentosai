import React, { useState } from 'react';
import { ExternalLink, FolderKanban, Plus, Search, Sparkles } from 'lucide-react';
import { Project, ViewType } from '../../types';

interface ProjectsViewProps {
  projects: Project[];
  onNavigate: (view: ViewType) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects: initialProjects, onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState('');

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.campaign.toLowerCase().includes(search.toLowerCase())
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
          onClick={() => onNavigate('ai-studio')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Project
        </button>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            onClick={() => onNavigate('ai-studio')}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer space-y-3 shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {proj.category}
              </span>
              <span className="text-[10px] text-slate-400">{proj.lastUpdated}</span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              {proj.title}
            </h3>

            <p className="text-xs text-slate-500">Campaign: {proj.campaign}</p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>{proj.itemCount} generated items</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                {proj.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
