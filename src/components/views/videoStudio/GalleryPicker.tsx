import React from 'react';
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react';
import type { VideoStudio } from './useVideoStudio';

/** Scene Builder: choose images and clips from the Gallery. */
export const GalleryPicker: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    brokenGalleryAssetIds,
    deletingGalleryAssetId,
    galleryPickerAssets,
    handleAddSelectedFromGallery,
    handleDeleteGalleryAsset,
    handleGalleryAssetLoadError,
    handleToggleGallerySelect,
    isLoadingGalleryPicker,
    selectedGalleryIds,
    setIsGalleryPickerOpen,
  } = studio;
  return (
    <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Choose from Gallery
        </span>
        <button
          type="button"
          onClick={() => setIsGalleryPickerOpen(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoadingGalleryPicker ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : galleryPickerAssets.length === 0 ? (
        <p className="py-8 text-center text-[11px] text-slate-400">
          No images or clips yet - upload some first.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {galleryPickerAssets.map((asset) => {
              const isSelected = selectedGalleryIds.has(asset.id);
              const isBroken = brokenGalleryAssetIds.has(asset.id);
              const isDeleting = deletingGalleryAssetId === asset.id;
              return (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggleGallerySelect(asset.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleToggleGallerySelect(asset.id);
                  }}
                  title={isBroken ? `${asset.fileName} (unavailable)` : asset.fileName}
                  className={`group relative aspect-video rounded-lg overflow-hidden bg-slate-950 border-2 transition-all ${
                    isBroken
                      ? 'border-transparent cursor-not-allowed'
                      : isSelected
                        ? 'border-blue-600 cursor-pointer'
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  {isBroken ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-500 bg-slate-900">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[9px] font-semibold">Unavailable</span>
                    </div>
                  ) : asset.type === 'video' || asset.type === 'character' ? (
                    <video
                      src={asset.url}
                      muted
                      className="w-full h-full object-cover"
                      onError={() => handleGalleryAssetLoadError(asset.id)}
                    />
                  ) : (
                    <img
                      src={asset.url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => handleGalleryAssetLoadError(asset.id)}
                    />
                  )}
                  {isSelected && !isBroken && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteGalleryAsset(asset.id);
                    }}
                    disabled={isDeleting}
                    title="Delete from gallery"
                    className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-100"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleAddSelectedFromGallery}
            disabled={selectedGalleryIds.size === 0}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedGalleryIds.size || ''} selected
          </button>
        </>
      )}
    </div>
  );
};
