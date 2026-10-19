import React from 'react';
import { ChevronLeft, ChevronRight, Layers, LayoutTemplate, Upload } from 'lucide-react';
import type { VideoStudio } from './useVideoStudio';

/** Step 1: the preview column next to the source panel. */
export const CreatePreview: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    clampedPreviewSceneIndex,
    previewAspectClass,
    previewScene,
    scenes,
    setPreviewSceneIndex,
    source,
    stylePreset,
  } = studio;
  return (
    <div className="space-y-3 lg:sticky lg:top-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</h3>
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div
          className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center ${previewAspectClass}`}
        >
          {source === 'prompt' && (
            <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
              <stylePreset.icon className="w-7 h-7" />
              <span className="text-[11px] font-semibold text-slate-400">{stylePreset.label}</span>
            </div>
          )}
          {source === 'upload' && (
            <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
              <Upload className="w-7 h-7" />
              <span className="text-[11px] font-semibold text-slate-400">
                Choose a file to preview it here
              </span>
            </div>
          )}
          {source === 'templates' && (
            <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
              <LayoutTemplate className="w-7 h-7" />
              <span className="text-[11px] font-semibold text-slate-400">
                Pick a clip to preview it here
              </span>
            </div>
          )}
          {source === 'scenes' &&
            (previewScene ? (
              <>
                {previewScene.visualType === 'video' ? (
                  <video
                    key={previewScene.id}
                    src={previewScene.visualUrl}
                    muted
                    loop
                    autoPlay
                    className={`w-full h-full ${previewScene.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                  />
                ) : (
                  <img
                    src={previewScene.visualUrl}
                    alt=""
                    className={`w-full h-full ${previewScene.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                  />
                )}
                {scenes.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewSceneIndex((clampedPreviewSceneIndex - 1 + scenes.length) % scenes.length)
                      }
                      title="Previous scene"
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSceneIndex((clampedPreviewSceneIndex + 1) % scenes.length)}
                      title="Next scene"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                <Layers className="w-7 h-7" />
                <span className="text-[11px] font-semibold text-slate-400">
                  Add a scene to preview it here
                </span>
              </div>
            ))}
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          {source === 'prompt' && `${stylePreset.aspectRatio} · ${stylePreset.durationSeconds}s`}
          {source === 'scenes' &&
            scenes.length > 0 &&
            `Scene ${clampedPreviewSceneIndex + 1} of ${scenes.length}`}
        </p>
      </div>
    </div>
  );
};
