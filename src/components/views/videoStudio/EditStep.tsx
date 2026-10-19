import React from 'react';
import { AlertTriangle, ArrowLeft, Info, Sparkles, Type } from 'lucide-react';
import { OutOfCreditsNotice } from '../../OutOfCreditsNotice';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_PRESETS,
  TEXT_COLOR_PRESETS,
  TEXT_POSITION_PRESETS,
  previewBoxWidth,
} from './constants';
import { VideoShapeLabel } from './VideoShapeLabel';
import type { VideoStudio } from './useVideoStudio';

/** Step 2: the clip with an optional text overlay, dragged and styled on the preview. */
export const EditStep: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    applyOverlayAndFinish,
    displayAspectRatio,
    error,
    finishWithoutOverlay,
    handleBackToScenes,
    handleGenerateFromPrompt,
    handleOverlayPointerDown,
    handleOverlayPointerMove,
    handleOverlayPointerUp,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    isDraggingOverlay,
    isEditingOverlayText,
    isResizingOverlay,
    onNavigate,
    outOfCredits,
    overlayColor,
    overlayFontFamilyId,
    overlayFontScale,
    overlayPoint,
    overlayPreviewFontSizePx,
    overlayPreviewRef,
    overlayText,
    resetAll,
    reusedClip,
    sceneWarning,
    selectedFontFamily,
    setIsEditingOverlayText,
    setOverlayColor,
    setOverlayFontFamilyId,
    setOverlayFontScale,
    setOverlayPoint,
    setOverlayText,
    setSourceVideoNaturalAspect,
    source,
    sourceVideoNaturalAspect,
    sourceVideoUrl,
  } = studio;
  if (!sourceVideoUrl) return null;
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {reusedClip && source === 'prompt' && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            We reused the clip you made earlier for this prompt - no credits were used.
          </p>
          <button
            type="button"
            onClick={() => handleGenerateFromPrompt(true)}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Make a new version (uses credits)
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        {source === 'scenes' ? (
          <button
            onClick={handleBackToScenes}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to editing scenes
          </button>
        ) : (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Start over
          </button>
        )}
        {source === 'scenes' && (
          <button
            onClick={resetAll}
            title="Discards the whole draft - scenes, narration, everything"
            className="text-[11px] font-semibold text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400"
          >
            Start over instead
          </button>
        )}
      </div>

      <div>
        <div
          ref={overlayPreviewRef}
          className="relative mx-auto rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950"
          style={{ width: previewBoxWidth(displayAspectRatio, 42), aspectRatio: displayAspectRatio }}
        >
          <video
            src={sourceVideoUrl}
            controls
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (el.videoWidth && el.videoHeight) {
                setSourceVideoNaturalAspect(el.videoWidth / el.videoHeight);
              }
            }}
            className="w-full h-full object-cover"
          />
          {/* Live WYSIWYG preview - click to edit inline, drag to
              reposition, drag the corner handle to resize. The real
              overlay is burned into the exported file by
              videoCompositor.ts at the exact same xPct/yPct/scale. */}
          {overlayText.trim() && !isEditingOverlayText && (
            <span
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
              className={`absolute inline-block px-3 py-1.5 rounded-md bg-black/55 font-bold text-center whitespace-nowrap touch-none select-none ${selectedFontFamily.previewClass} ${
                isDraggingOverlay ? 'cursor-grabbing ring-2 ring-blue-500' : 'cursor-grab'
              }`}
              style={{
                left: `${overlayPoint.xPct}%`,
                top: `${overlayPoint.yPct}%`,
                transform: 'translate(-50%, -50%)',
                color: overlayColor,
                fontFamily: selectedFontFamily.stack,
                fontSize: `${overlayPreviewFontSizePx}px`,
              }}
            >
              {overlayText}
              <span
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                title="Drag to resize"
                className={`absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md touch-none ${
                  isResizingOverlay ? 'cursor-nwse-resize scale-110' : 'cursor-nwse-resize'
                }`}
              />
            </span>
          )}
          {overlayText.trim() && isEditingOverlayText && (
            <input
              type="text"
              value={overlayText}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setOverlayText(e.target.value)}
              onBlur={() => setIsEditingOverlayText(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.currentTarget.blur();
                }
              }}
              maxLength={80}
              className={`absolute px-3 py-1.5 rounded-md bg-black/55 font-bold text-center outline-none ring-2 ring-blue-500 ${selectedFontFamily.previewClass}`}
              style={{
                left: `${overlayPoint.xPct}%`,
                top: `${overlayPoint.yPct}%`,
                transform: 'translate(-50%, -50%)',
                color: overlayColor,
                fontFamily: selectedFontFamily.stack,
                fontSize: `${overlayPreviewFontSizePx}px`,
                width: `${Math.max(120, overlayText.length * overlayPreviewFontSizePx * 0.62)}px`,
              }}
            />
          )}
        </div>
      </div>
      {sourceVideoNaturalAspect && <VideoShapeLabel ratio={sourceVideoNaturalAspect} />}
      {overlayText.trim() && (
        <p className="text-center text-[10px] text-slate-400 -mt-2">
          Click the text to edit it, drag to move it, or drag the blue dot to resize it
        </p>
      )}

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Type className="w-3.5 h-3.5" /> Add text (optional)
        </div>
        <input
          type="text"
          value={overlayText}
          onChange={(e) => setOverlayText(e.target.value)}
          placeholder="e.g. Sale ends today!"
          maxLength={80}
          className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          {TEXT_POSITION_PRESETS.map((pos) => {
            const Icon = pos.icon;
            const isActive = overlayPoint.xPct === pos.point.xPct && overlayPoint.yPct === pos.point.yPct;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => setOverlayPoint(pos.point)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {pos.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400">
          Or drag the text directly on the preview above for a custom position.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Font</label>
            <select
              value={overlayFontFamilyId}
              onChange={(e) => setOverlayFontFamilyId(e.target.value as (typeof FONT_FAMILY_OPTIONS)[number]['id'])}
              className="w-full text-xs px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            >
              {FONT_FAMILY_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Size</label>
            <div className="flex gap-1">
              {FONT_SIZE_PRESETS.map((sizeOpt) => {
                const isActive = overlayFontScale === sizeOpt.scale;
                return (
                  <button
                    key={sizeOpt.id}
                    type="button"
                    onClick={() => setOverlayFontScale(sizeOpt.scale)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {sizeOpt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400">Or drag the blue dot on the preview.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={overlayColor}
              onChange={(e) => setOverlayColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent p-0.5"
              title="Custom color"
            />
            <div className="flex gap-1.5">
              {TEXT_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setOverlayColor(color)}
                  title={color}
                  style={{ backgroundColor: color }}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    overlayColor === color
                      ? 'border-blue-600 scale-110'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

      {error && !outOfCredits && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-snug">{error}</p>
        </div>
      )}

      {sceneWarning && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-snug">{sceneWarning}</p>
        </div>
      )}

      <div className="flex gap-2.5">
        {overlayText.trim() ? (
          <button
            onClick={applyOverlayAndFinish}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" /> Apply Text & Continue
          </button>
        ) : (
          <button
            onClick={finishWithoutOverlay}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            Continue without text
          </button>
        )}
      </div>
    </div>
  );
};
