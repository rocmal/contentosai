import React, { useEffect, useState } from 'react';
import { FileAudio, FolderOpen, Loader2, Mic, Search, Trash2, Video } from 'lucide-react';
import { ViewType } from '../../types';
import { deleteMediaAsset, listMyGallery, MediaAsset, MediaAssetType } from '../../lib/api';

interface MediaLibraryViewProps {
  onNavigate: (view: ViewType) => void;
}

const FILTERS: { id: 'all' | MediaAssetType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  { id: 'document', label: 'Documents' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = () => {
  const [filter, setFilter] = useState<'all' | MediaAssetType>('all');
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      setAssets(await listMyGallery(filter === 'all' ? undefined : filter, 60));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media library');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleDelete = async (id: string) => {
    setAssets((prev) => prev?.filter((a) => a.id !== id) ?? prev);
    try {
      await deleteMediaAsset(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
      await load();
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <FolderOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Media Library
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Everything generated across Image, Voice, Video, and Character Studio.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filter === f.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {assets === null ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Search className="w-4 h-4" /> No assets yet. Generate something in one of the Studios to see it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs group"
            >
              <div className="aspect-video rounded-xl bg-slate-950 overflow-hidden relative flex items-center justify-center">
                {asset.type === 'image' ? (
                  <img src={asset.url} alt={asset.fileName} className="w-full h-full object-cover" />
                ) : asset.type === 'video' ? (
                  <video src={asset.url} className="w-full h-full object-cover" muted />
                ) : asset.type === 'audio' ? (
                  <Mic className="w-8 h-8 text-slate-500" />
                ) : (
                  <FileAudio className="w-8 h-8 text-slate-500" />
                )}
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {asset.fileName}
                </p>
                <span className="text-[10px] text-slate-400 shrink-0">{formatSize(asset.sizeBytes)}</span>
              </div>
              {asset.prompt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{asset.prompt}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
