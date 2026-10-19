import React from 'react';
import { Upload } from 'lucide-react';
import type { VideoStudio } from './useVideoStudio';

/** Upload tab: pick a video file from the device. */
export const UploadPanel: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const { fileInputRef, handleFileSelected } = studio;
  return (
    <div className="p-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center gap-3 text-center">
      <Upload className="w-8 h-8 text-slate-400" />
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">Upload a video from your device</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          MP4, WebM, or MOV. You'll be able to add text on top of it next.
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelected}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
      >
        Choose File
      </button>
    </div>
  );
};
