import React from 'react';
import { AlertTriangle, Bookmark, Check, Copy, Download, FolderPlus, Loader2, RotateCcw, Send, Share2, X, Youtube } from 'lucide-react';
import { previewBoxWidth } from './constants';
import { VideoShapeLabel } from './VideoShapeLabel';
import type { VideoStudio } from './useVideoStudio';

const secondaryButton =
  'flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-all disabled:cursor-default';

/** Step 3: the finished video - download and post first (the post composer: now or scheduled); save, share,
 * template and start again below. */
export const ResultStep: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    displayAspectRatio,
    finalMimeType,
    finalVideoUrl,
    handleDownload,
    handleOpenSaveTemplatePanel,
    handlePostVideo,
    handleUploadToYouTube,
    handleSaveTemplate,
    handleSaveToGallery,
    handleShare,
    handleShareToFacebook,
    hasOverlay,
    isDownloading,
    isSavingTemplate,
    isSavingToGallery,
    resetAll,
    saveTemplateError,
    saveTemplateStatus,
    savedToGallery,
    setShowSaveTemplatePanel,
    setTemplateTitle,
    setTemplateVisibility,
    shareStatus,
    showSaveTemplatePanel,
    sourceVideoNaturalAspect,
    templateTitle,
    templateVisibility,
  } = studio;
  if (!finalVideoUrl) return null;
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div
        className="mx-auto rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950"
        style={{ width: previewBoxWidth(displayAspectRatio, 42), aspectRatio: displayAspectRatio }}
      >
        <video src={finalVideoUrl} controls autoPlay className="w-full h-full object-cover" />
      </div>
      {sourceVideoNaturalAspect && <VideoShapeLabel ratio={sourceVideoNaturalAspect} />}

      {hasOverlay && (
        <p className="text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" /> Text overlay applied - it's part of the exported file
        </p>
      )}

      {/* The two things people do with a finished video: download it or post it. */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>Download {finalMimeType.includes('webm') ? 'WebM' : 'MP4'}</span>
        </button>
        <button
          onClick={() => void handlePostVideo()}
          disabled={isSavingToGallery}
          title="Post now or schedule it to your LinkedIn profile"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60"
        >
          {isSavingToGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Post to LinkedIn</span>
        </button>
        <button
          onClick={() => void handleUploadToYouTube()}
          disabled={isSavingToGallery}
          title="Upload now or schedule it to your YouTube channel"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60"
        >
          {isSavingToGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
          <span>Upload to YouTube</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleSaveToGallery}
          disabled={isSavingToGallery || savedToGallery}
          className={`${secondaryButton} ${savedToGallery ? '!text-emerald-600 dark:!text-emerald-400' : ''}`}
        >
          {isSavingToGallery ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : savedToGallery ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <FolderPlus className="w-3.5 h-3.5" />
          )}
          <span>{savedToGallery ? 'Saved to Gallery' : 'Save to Gallery'}</span>
        </button>

        <button onClick={handleShare} className={secondaryButton}>
          {shareStatus === 'sharing' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : shareStatus === 'shared' ? (
            <Check className="w-3.5 h-3.5" />
          ) : shareStatus === 'copied' ? (
            <Copy className="w-3.5 h-3.5" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          <span>{shareStatus === 'shared' ? 'Shared' : shareStatus === 'copied' ? 'Link copied' : 'Share'}</span>
        </button>

        <button onClick={handleShareToFacebook} className={secondaryButton}>
          <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />
          <span>Facebook</span>
        </button>

        <button onClick={handleOpenSaveTemplatePanel} className={secondaryButton}>
          <Bookmark className="w-3.5 h-3.5" />
          <span>Save as template</span>
        </button>

        <button onClick={resetAll} className={secondaryButton}>
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Create another</span>
        </button>
      </div>

      {shareStatus === 'unsupported' && (
        <p className="text-center text-[11px] text-slate-400">
          Sharing/copying isn't supported in this browser - use Download instead.
        </p>
      )}



      {showSaveTemplatePanel && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Bookmark className="w-3.5 h-3.5" /> Save as template
            </div>
            <button
              onClick={() => setShowSaveTemplatePanel(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {saveTemplateStatus === 'saved' ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4 shrink-0" />
              Saved - it'll show up under Templates next time.
            </div>
          ) : (
            <>
              <input
                type="text"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="Template name..."
                maxLength={150}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
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

              {saveTemplateStatus === 'error' && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-snug break-words">
                    Could not save this template. {saveTemplateError ?? 'Please try again.'}
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate || !templateTitle.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {isSavingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                <span>Save Template</span>
              </button>
            </>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-400 max-w-md mx-auto">
        On a phone, <span className="font-semibold">Share</span> opens Instagram, WhatsApp and your other apps; on a
        computer, download the video and post it from the app. Scheduling needs the account connected in Integrations.
      </p>
    </div>
  );
};
