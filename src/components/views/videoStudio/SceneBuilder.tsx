import React from 'react';
import { Bookmark, FolderOpen, Layers, Loader2, Pencil, Play, Upload, X } from 'lucide-react';
import { SCENE_ASPECT_RATIO_OPTIONS, SCENE_TRANSITION_OPTIONS, previewBoxWidth } from './constants';
import { DeleteDraftDialog } from './DeleteDraftDialog';
import { DraftPicker } from './DraftPicker';
import { GalleryPicker } from './GalleryPicker';
import { NarrationPanel } from './NarrationPanel';
import { SceneList } from './SceneList';
import type { VideoStudio } from './useVideoStudio';

/** Scene Builder tab: images and clips in order, one narration, one combined video. */
export const SceneBuilder: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    displayAspectRatio,
    draftTitle,
    draftToDelete,
    galleryUsage,
    handleGenerateSceneVideo,
    handleOpenGalleryPicker,
    handlePreviewSceneVideo,
    handleScenesFileUpload,
    isGalleryPickerOpen,
    isPreviewingVideo,
    isUploadingScenes,
    pastProjects,
    previewVideoUrl,
    sceneAspectRatio,
    sceneSaveAsTemplate,
    sceneTransition,
    scenes,
    setDraftTitle,
    setPreviewVideoUrl,
    setSceneAspectRatio,
    setSceneSaveAsTemplate,
    setSceneTransition,
    setTemplateTitle,
    setTemplateVisibility,
    templateTitle,
    templateVisibility,
    videoProjectId,
  } = studio;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Upload images/clips, narrate the whole video, generate
        </h3>
        <span className="text-[10px] text-slate-400">
          {scenes.length} scene{scenes.length === 1 ? '' : 's'}
        </span>
      </div>

      {videoProjectId && (
        <div className="flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => {
              if (!draftTitle.trim()) setDraftTitle('Untitled video');
            }}
            placeholder="Untitled video"
            maxLength={150}
            title="Rename this draft"
            className="flex-1 min-w-0 text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 transition-colors py-0.5"
          />
        </div>
      )}

      {scenes.length === 0 && pastProjects.some((p) => p.status === 'draft') && <DraftPicker studio={studio} />}

      {draftToDelete && <DeleteDraftDialog studio={studio} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
            Shape
          </span>
          {SCENE_ASPECT_RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSceneAspectRatio(opt.id)}
              title={opt.label}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                sceneAspectRatio === opt.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400'
              }`}
            >
              {opt.id}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
            Transition
          </span>
          {SCENE_TRANSITION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSceneTransition(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                sceneTransition === opt.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            type="file"
            accept="video/*,image/*"
            multiple
            id="scenes-multi-upload"
            className="hidden"
            disabled={isUploadingScenes}
            onChange={(e) => {
              void handleScenesFileUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <label
            htmlFor="scenes-multi-upload"
            className={`flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isUploadingScenes ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isUploadingScenes ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploadingScenes ? 'Uploading...' : 'Upload images or clips'}</span>
          </label>
          <button
            type="button"
            onClick={handleOpenGalleryPicker}
            disabled={isUploadingScenes}
            className="flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-4 h-4" /> Choose from Gallery
          </button>
        </div>
        {galleryUsage && (
          <p
            className={`text-[10px] text-right ${
              galleryUsage.count >= galleryUsage.max
                ? 'text-red-500 dark:text-red-400 font-semibold'
                : 'text-slate-400'
            }`}
          >
            {galleryUsage.count}/{galleryUsage.max} images/clips used
          </p>
        )}
      </div>

      {isGalleryPickerOpen && <GalleryPicker studio={studio} />}

      {scenes.length > 0 && <SceneList studio={studio} />}

      <NarrationPanel studio={studio} />

      {previewVideoUrl && (
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Preview (placeholder voice sample)
            </span>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(previewVideoUrl);
                setPreviewVideoUrl(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            className="relative mx-auto rounded-xl overflow-hidden bg-slate-950"
            style={{ width: previewBoxWidth(displayAspectRatio, 24), aspectRatio: displayAspectRatio }}
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Free - uses a sample of the selected voice, not your actual narration text. Click Generate Video
            for the real thing.
          </p>
        </div>
      )}

      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={sceneSaveAsTemplate}
            onChange={(e) => {
              setSceneSaveAsTemplate(e.target.checked);
              if (e.target.checked && !templateTitle.trim()) {
                setTemplateTitle(draftTitle.trim() || 'My video template');
              }
            }}
            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          <Bookmark className="w-3.5 h-3.5 shrink-0" />
          <span>Also save as a template</span>
        </label>
        {sceneSaveAsTemplate && (
          <>
            <input
              type="text"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="Template name..."
              maxLength={150}
              className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateVisibility('private')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                  templateVisibility === 'private'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                Just me
              </button>
              <button
                type="button"
                onClick={() => setTemplateVisibility('team')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                  templateVisibility === 'team'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                My whole team
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Saved automatically once Generate Video finishes.
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreviewSceneVideo}
          disabled={scenes.length === 0 || isPreviewingVideo}
          title="Free - previews pacing and voice using a local sample, no API call"
          className="flex-1 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isPreviewingVideo ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Preview (free)</span>
        </button>
        <button
          onClick={handleGenerateSceneVideo}
          disabled={scenes.length === 0}
          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <Layers className="w-4 h-4" />
          <span>Generate Video</span>
        </button>
      </div>
    </div>
  );
};
