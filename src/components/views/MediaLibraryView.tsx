import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  FolderOpen,
  Film,
  History as HistoryIcon,
  Image as ImageIcon,
  Loader2,
  Mic,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ViewType } from '../../types';
import {
  deleteMediaAsset,
  getGalleryUsage,
  GalleryUsage,
  LibraryItem,
  listLibrary,
  MediaAssetType,
  renameMediaAsset,
} from '../../lib/api';
import {
  cleanPrompt,
  requestReuse,
  STUDIO_LABEL,
  STUDIO_VIEW,
  studioForType,
  takeGallerySearch,
} from '../../lib/reuse';

interface MediaLibraryViewProps {
  onNavigate: (view: ViewType) => void;
}

type Tab = 'mine' | 'team' | 'history';

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'mine', label: 'My gallery', icon: FolderOpen },
  { id: 'team', label: 'Team gallery', icon: Users },
  { id: 'history', label: 'Creation history', icon: HistoryIcon },
];

const FILTERS: { id: 'all' | MediaAssetType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Voice' },
];

const PAGE_SIZE = 24;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function typeLabel(type: MediaAssetType): string {
  return type === 'audio' ? 'Voice' : type === 'character' ? 'Avatar' : type.charAt(0).toUpperCase() + type.slice(1);
}

/** The item itself: a picture, a video frame, or an audio tile. */
const Thumb: React.FC<{ item: LibraryItem; className?: string }> = ({ item, className = '' }) => {
  if (item.type === 'image') {
    return <img src={item.url} alt={item.fileName} loading="lazy" className={`object-cover ${className}`} />;
  }
  if (item.type === 'video' || item.type === 'character') {
    return <video src={item.url} muted preload="metadata" className={`object-cover ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center bg-slate-900 text-slate-500 ${className}`}>
      {item.type === 'audio' ? <Mic className="w-7 h-7" /> : <Film className="w-7 h-7" />}
    </div>
  );
};

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({ onNavigate }) => {
  const [tab, setTab] = useState<Tab>('mine');
  const [type, setType] = useState<'all' | MediaAssetType>('all');
  // Opened from the global search: start with that search typed in.
  const [initialSearch] = useState(() => takeGallerySearch());
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<GalleryUsage | null>(null);
  const [preview, setPreview] = useState<LibraryItem | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (pageNumber: number) => {
      const result = await listLibrary({
        scope: tab === 'team' ? 'team' : 'mine',
        type: type === 'all' ? undefined : type,
        search,
        generatedOnly: tab === 'history',
        page: pageNumber,
        limit: PAGE_SIZE,
      });
      return result;
    },
    [tab, type, search],
  );

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setError(null);
    setItems(null);
    setPage(1);
    try {
      const result = await fetchPage(1);
      if (requestId !== requestRef.current) return;
      setItems(result.items);
      setTotal(result.meta.totalItems);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setItems([]);
      setError(err instanceof Error ? err.message : 'Could not load your gallery.');
    }
  }, [fetchPage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    getGalleryUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreview(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchPage(page + 1);
      setItems((prev) => [...(prev ?? []), ...result.items]);
      setPage(page + 1);
      setTotal(result.meta.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  };

  const startRename = (item: LibraryItem) => {
    setRenamingId(item.id);
    setNameDraft(item.fileName.replace(/\.[a-z0-9]{1,5}$/i, ''));
  };

  const saveRename = async (item: LibraryItem) => {
    const name = nameDraft.trim();
    if (!name || name === item.fileName.replace(/\.[a-z0-9]{1,5}$/i, '')) {
      setRenamingId(null);
      return;
    }
    setBusyId(item.id);
    try {
      const updated = await renameMediaAsset(item.id, name);
      setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, fileName: updated.fileName } : i)) ?? prev);
      setPreview((p) => (p && p.id === item.id ? { ...p, fileName: updated.fileName } : p));
      setRenamingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename it.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: LibraryItem) => {
    setBusyId(item.id);
    try {
      await deleteMediaAsset(item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? prev);
      setTotal((t) => Math.max(0, t - 1));
      setPreview((p) => (p && p.id === item.id ? null : p));
      setConfirmDeleteId(null);
      getGalleryUsage().then(setUsage).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete it.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (item: LibraryItem) => {
    setBusyId(item.id);
    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('download failed');
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // The file host may not allow a direct download - open it so it can be saved from there.
      window.open(item.url, '_blank', 'noopener');
    } finally {
      setBusyId(null);
    }
  };

  const createAgain = (item: LibraryItem) => {
    const studio = studioForType(item.type);
    if (!studio || !item.prompt) return;
    requestReuse({ studio, prompt: cleanPrompt(studio, item.prompt) });
    onNavigate(STUDIO_VIEW[studio]);
  };

  const canCreateAgain = (item: LibraryItem) => Boolean(studioForType(item.type) && item.prompt);

  const showCreator = tab === 'team';
  const emptyText =
    search || type !== 'all'
      ? 'Nothing matches that search.'
      : tab === 'history'
        ? 'Nothing created yet. Make something in a studio and it will be listed here.'
        : tab === 'team'
          ? 'Your team has not saved anything yet.'
          : 'Nothing saved yet. Generate something in a studio and save it to see it here.';

  const actionButton =
    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all';

  const renderName = (item: LibraryItem) =>
    renamingId === item.id ? (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={nameDraft}
          maxLength={100}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void saveRename(item);
            if (e.key === 'Escape') setRenamingId(null);
          }}
          className="flex-1 min-w-0 text-xs px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-blue-400 outline-none text-slate-900 dark:text-white"
        />
        <button
          type="button"
          onClick={() => void saveRename(item)}
          disabled={busyId === item.id}
          className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          title="Save name"
        >
          {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setRenamingId(null)}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.fileName}>
          {item.fileName}
        </p>
        {item.canManage && (
          <button
            type="button"
            onClick={() => startRename(item)}
            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Rename"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    );

  const renderDelete = (item: LibraryItem) =>
    !item.canManage ? null : confirmDeleteId === item.id ? (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => void handleDelete(item)}
          disabled={busyId === item.id}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busyId === item.id ? 'Deleting...' : 'Delete for good'}
        </button>
        <button type="button" onClick={() => setConfirmDeleteId(null)} className={actionButton}>
          Keep
        </button>
      </span>
    ) : (
      <button
        type="button"
        onClick={() => setConfirmDeleteId(item.id)}
        className={`${actionButton} hover:!text-red-600`}
        title="Delete"
      >
        <Trash2 className="w-3 h-3" /> Delete
      </button>
    );

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setConfirmDeleteId(null);
                setRenamingId(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
        </div>
        {usage && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-200">{usage.count}</span> of {usage.max} images and
            videos saved
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tab === 'history' ? 'Search what you asked for...' : 'Search by name or prompt...'}
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                type === f.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void load()} className={actionButton} title="Refresh">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 break-words">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          {emptyText}
        </div>
      ) : tab === 'history' ? (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const studio = studioForType(item.type);
            return (
              <li
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  className="w-full sm:w-28 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0"
                  title="View"
                >
                  <Thumb item={item} className="w-full h-full" />
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 uppercase">
                      {studio ? STUDIO_LABEL[studio] : typeLabel(item.type)}
                    </span>
                    <span className="text-slate-400 font-medium">{formatDate(item.createdAt)}</span>
                    {item.provider && (
                      <span className="text-slate-400 font-medium">
                        {item.provider}
                        {item.model ? ` · ${item.model}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                    {item.prompt ? cleanPrompt(studio ?? 'image', item.prompt) : item.fileName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {canCreateAgain(item) && (
                    <button
                      type="button"
                      onClick={() => createAgain(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-500"
                    >
                      <RefreshCw className="w-3 h-3" /> Create again
                    </button>
                  )}
                  <button type="button" onClick={() => setPreview(item)} className={actionButton}>
                    <Eye className="w-3 h-3" /> View
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs"
            >
              <button
                type="button"
                onClick={() => setPreview(item)}
                className="block w-full aspect-video rounded-xl bg-slate-950 overflow-hidden relative"
                title="View"
              >
                <Thumb item={item} className="w-full h-full" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-semibold">
                  {typeLabel(item.type)}
                </span>
              </button>
              <div className="space-y-0.5">
                {renderName(item)}
                <p className="text-[10px] text-slate-400">
                  {showCreator && (
                    <>
                      <span className="font-semibold text-slate-500 dark:text-slate-300">
                        {item.canManage && item.createdByName ? `${item.createdByName}` : (item.createdByName ?? 'Team member')}
                      </span>{' '}
                      ·{' '}
                    </>
                  )}
                  {formatDate(item.createdAt)} · {formatSize(item.sizeBytes)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setPreview(item)} className={actionButton}>
                  <Eye className="w-3 h-3" /> View
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(item)}
                  disabled={busyId === item.id}
                  className={actionButton}
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                {canCreateAgain(item) && (
                  <button type="button" onClick={() => createAgain(item)} className={actionButton}>
                    <RefreshCw className="w-3 h-3" /> Create again
                  </button>
                )}
                {renderDelete(item)}
              </div>
            </div>
          ))}
        </div>
      )}

      {items !== null && items.length > 0 && items.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Show more ({total - items.length} left)
          </button>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0 flex-1">{renderName(preview)}</div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                {preview.type === 'image' ? (
                  <img src={preview.url} alt={preview.fileName} className="max-h-[60vh] w-auto object-contain" />
                ) : preview.type === 'video' || preview.type === 'character' ? (
                  <video src={preview.url} controls className="max-h-[60vh] w-full" />
                ) : preview.type === 'audio' ? (
                  <div className="w-full p-8 flex flex-col items-center gap-4">
                    <ImageIcon className="hidden" />
                    <Mic className="w-8 h-8 text-slate-500" />
                    <audio src={preview.url} controls className="w-full" />
                  </div>
                ) : (
                  <p className="p-8 text-xs text-slate-400">No preview for this file type.</p>
                )}
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Type</dt>
                  <dd className="text-slate-800 dark:text-slate-100">{typeLabel(preview.type)}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Made</dt>
                  <dd className="text-slate-800 dark:text-slate-100">{formatDate(preview.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Size</dt>
                  <dd className="text-slate-800 dark:text-slate-100">{formatSize(preview.sizeBytes)}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Made with</dt>
                  <dd className="text-slate-800 dark:text-slate-100">{preview.provider ? `${preview.provider}${preview.model ? ` · ${preview.model}` : ''}` : 'Uploaded'}</dd>
                </div>
              </dl>

              {preview.createdByName && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Made by <span className="font-semibold text-slate-700 dark:text-slate-200">{preview.createdByName}</span>
                </p>
              )}

              {preview.prompt && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {preview.type === 'audio' ? 'What was said' : 'What you asked for'}
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                    {cleanPrompt(studioForType(preview.type) ?? 'image', preview.prompt)}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {canCreateAgain(preview) && (
                  <button
                    type="button"
                    onClick={() => createAgain(preview)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Create again in {STUDIO_LABEL[studioForType(preview.type)!]}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDownload(preview)}
                  disabled={busyId === preview.id}
                  className={actionButton}
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                {renderDelete(preview)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
