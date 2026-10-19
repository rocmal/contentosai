import React from 'react';
import { Trash2 } from 'lucide-react';
import { RECENT_PROJECTS_TO_LOAD } from './constants';
import type { VideoStudio } from './useVideoStudio';

/** Scene Builder: "Continue a draft" list with delete buttons. */
export const DraftPicker: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    draftDeleteError,
    handleResumeProject,
    pastProjects,
    setDraftToDelete,
    setShowAllDrafts,
    showAllDrafts,
  } = studio;
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Continue a draft ({pastProjects.filter((p) => p.status === 'draft').length})
      </span>
      <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scroll">
        {pastProjects
          .filter((p) => p.status === 'draft')
          .slice(0, showAllDrafts ? undefined : 4)
          .map((p) => (
            <div
              key={p.id}
              className="relative rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors"
            >
              <button
                type="button"
                onClick={() => handleResumeProject(p)}
                className="pl-3 pr-8 py-2 text-left"
              >
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  {p.title}
                </div>
                <div className="text-[10px] text-slate-400">
                  {p.scenes.length} scene{p.scenes.length === 1 ? '' : 's'} - {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDraftToDelete(p)}
                title="Delete this draft"
                className="absolute top-1.5 right-1.5 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
      </div>
      {pastProjects.filter((p) => p.status === 'draft').length > 4 && (
        <button
          type="button"
          onClick={() => setShowAllDrafts((v) => !v)}
          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showAllDrafts ? 'Show fewer' : 'Show all drafts'}
        </button>
      )}
      {draftDeleteError && <p className="text-[11px] text-red-600 dark:text-red-400">{draftDeleteError}</p>}
      <p className="text-[10px] text-slate-400">
        Drafts are saved automatically as you work. This list shows the drafts among your {RECENT_PROJECTS_TO_LOAD} most recently edited videos, so delete the ones you no longer need.
      </p>
    </div>
  );
};
