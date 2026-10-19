import React from 'react';
import { ChevronDown, ChevronUp, Crop, GripVertical, Trash2 } from 'lucide-react';
import { SceneFilterPreset } from '../../../lib/videoCompositor';
import { ASPECT_RATIO_NUMERIC, SCENE_FILTER_OPTIONS } from './constants';
import type { VideoStudio } from './useVideoStudio';

/** Scene Builder: the scenes, with length, filter, motion, fit and crop for each. */
export const SceneList: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    clampedPreviewSceneIndex,
    cropEditingSceneId,
    dragOverSceneId,
    draggedSceneId,
    handleMoveScene,
    handleRemoveScene,
    handleSceneDragEnd,
    handleSceneDrop,
    handleSceneDurationChange,
    handleSceneFilterChange,
    handleSceneFitToggle,
    handleSceneFocalDrag,
    handleSceneMotionToggle,
    sceneAspectRatio,
    scenes,
    setCropEditingSceneId,
    setDragOverSceneId,
    setDraggedSceneId,
    setPreviewSceneIndex,
  } = studio;
  return (
    <div className="space-y-2">
      {scenes.map((scene, index) => (
        <div
          key={scene.id}
          draggable
          onClick={() => setPreviewSceneIndex(index)}
          onDragStart={() => setDraggedSceneId(scene.id)}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragOverSceneId !== scene.id) setDragOverSceneId(scene.id);
          }}
          onDrop={() => handleSceneDrop(scene.id)}
          onDragEnd={handleSceneDragEnd}
          title="Click to preview this scene"
          className={`rounded-xl bg-white dark:bg-slate-900 border shadow-xs cursor-pointer transition-all ${
            draggedSceneId === scene.id
              ? 'opacity-40 border-blue-400 dark:border-blue-600'
              : dragOverSceneId === scene.id && draggedSceneId && draggedSceneId !== scene.id
                ? 'border-blue-500 ring-2 ring-blue-500/30'
                : clampedPreviewSceneIndex === index
                  ? 'border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/40'
                  : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="p-2.5 flex items-center gap-3">
            <span
              title="Drag to reorder"
              className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </span>

            <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
              {scene.visualType === 'video' ? (
                <video
                  src={scene.visualUrl}
                  muted
                  className="w-full h-full"
                  style={{
                    objectFit: scene.fit === 'contain' ? 'contain' : 'cover',
                    objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                  }}
                />
              ) : (
                <img
                  src={scene.visualUrl}
                  alt=""
                  className="w-full h-full"
                  style={{
                    objectFit: scene.fit === 'contain' ? 'contain' : 'cover',
                    objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                  }}
                />
              )}
            </div>

            <span className="flex-1 min-w-0 text-xs font-bold text-slate-900 dark:text-white">
              Scene {index + 1}
            </span>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={scene.durationSeconds}
                onChange={(e) => handleSceneDurationChange(scene.id, e.target.value)}
                title="Seconds this slide shows"
                className="w-14 text-[11px] px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400">s</span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveScene(scene.id, 'up');
                }}
                disabled={index === 0}
                title="Move up"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveScene(scene.id, 'down');
                }}
                disabled={index === scenes.length - 1}
                title="Move down"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveScene(scene.id);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            className="px-2.5 pb-2.5 pl-[3.75rem] flex items-center gap-1.5 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <select
              value={scene.filter}
              onChange={(e) => handleSceneFilterChange(scene.id, e.target.value as SceneFilterPreset)}
              title="Color filter"
              className="text-[10px] px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none focus:border-blue-500"
            >
              {SCENE_FILTER_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>

            {scene.visualType === 'image' && (
              <button
                type="button"
                onClick={() => handleSceneMotionToggle(scene.id)}
                title="Slow pan/zoom instead of a static hold"
                className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${
                  scene.motion === 'kenburns'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                Ken Burns
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSceneFitToggle(scene.id)}
              title={
                scene.fit === 'contain'
                  ? 'Showing the whole image, letterboxed - click to crop-to-fill instead'
                  : 'Cropping to fill the frame - click to show the whole image, letterboxed instead'
              }
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${
                scene.fit === 'contain'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
            >
              {scene.fit === 'contain' ? 'Fit' : 'Fill'}
            </button>

            <button
              type="button"
              onClick={() => setCropEditingSceneId((prev) => (prev === scene.id ? null : scene.id))}
              disabled={scene.fit === 'contain'}
              title={
                scene.fit === 'contain'
                  ? 'Not used in Fit mode - the whole image is always shown centered'
                  : 'Choose what stays in frame'
              }
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                cropEditingSceneId === scene.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
            >
              <Crop className="w-3 h-3" /> Crop
            </button>
          </div>

          {cropEditingSceneId === scene.id && (
            <div className="px-2.5 pb-3" onClick={(e) => e.stopPropagation()}>
              <div
                className="relative w-full max-w-[220px] mx-auto rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-crosshair select-none touch-none"
                style={{ aspectRatio: ASPECT_RATIO_NUMERIC[sceneAspectRatio] }}
                onPointerDown={(e) => {
                  // Keeps pointermove firing on this element even
                  // once the cursor leaves its ~220px bounds mid-
                  // drag - without capture, a fast drag near the
                  // edge silently stops updating the focal point.
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleSceneFocalDrag(scene.id)(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) handleSceneFocalDrag(scene.id)(e);
                }}
              >
                {scene.visualType === 'video' ? (
                  <video
                    src={scene.visualUrl}
                    muted
                    className="w-full h-full pointer-events-none"
                    style={{
                      objectFit: 'cover',
                      objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                    }}
                  />
                ) : (
                  <img
                    src={scene.visualUrl}
                    alt=""
                    className="w-full h-full pointer-events-none"
                    style={{
                      objectFit: 'cover',
                      objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                    }}
                  />
                )}
                <div
                  className="absolute w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow pointer-events-none"
                  style={{
                    left: `${scene.focalXPct}%`,
                    top: `${scene.focalYPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                Drag to choose what stays in frame
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
