import React from 'react';
import type { VideoStudio } from './useVideoStudio';

/** Scene Builder: confirm before deleting a draft. */
export const DeleteDraftDialog: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const { draftToDelete, handleDeleteDraft, setDraftToDelete } = studio;
  if (!draftToDelete) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => setDraftToDelete(null)}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete this draft?</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          "{draftToDelete.title}" ({draftToDelete.scenes.length} scene
          {draftToDelete.scenes.length === 1 ? '' : 's'}) will be removed. Your uploaded images and clips in the Gallery are not deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraftToDelete(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={handleDeleteDraft}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
          >
            Delete draft
          </button>
        </div>
      </div>
    </div>
  );
};
