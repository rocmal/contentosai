import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CreditCard,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Loader2,
  Mic,
  Search,
  Settings,
  UserPlus,
  User as UserIcon,
  Users,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { ViewType } from '../types';
import { LibraryItem, listLibrary } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { VIDEO_PROMPT_TEMPLATES } from '../lib/videoPromptTemplates';
import { requestGallerySearch, requestReuse } from '../lib/reuse';
import { MANAGE_MEMBERS_PERMISSION, requestInviteForm } from '../lib/teamInvite';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
}

type Group = 'Go to' | 'Do' | 'Video templates' | 'Your gallery';

interface Entry {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  /** Extra words that should find this entry, e.g. "upgrade" finds Billing. */
  keywords?: string;
  icon: React.FC<{ className?: string }>;
  thumbnail?: string;
  run: () => void;
}

const GROUP_ORDER: Group[] = ['Go to', 'Do', 'Video templates', 'Your gallery'];

const TYPE_LABELS: Record<string, string> = { image: 'Image', video: 'Video', audio: 'Voice', character: 'Avatar' };

/** Search across pages, actions, video templates and everything your team has saved. Opened with Ctrl+K (or Cmd+K). */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [galleryHits, setGalleryHits] = useState<LibraryItem[]>([]);
  const [searchingGallery, setSearchingGallery] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const canInvite = Boolean(user?.permissions?.includes(MANAGE_MEMBERS_PERMISSION));
  const term = query.trim();

  // A fresh, empty search each time it opens.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      setGalleryHits([]);
    }
  }, [isOpen]);

  // Search what has been made while the person types.
  useEffect(() => {
    if (!isOpen || term.length < 2) {
      setGalleryHits([]);
      setSearchingGallery(false);
      return;
    }
    let cancelled = false;
    setSearchingGallery(true);
    const timer = window.setTimeout(() => {
      listLibrary({ scope: 'team', search: term, limit: 6 })
        .then((page) => !cancelled && setGalleryHits(page.items))
        .catch(() => !cancelled && setGalleryHits([]))
        .finally(() => !cancelled && setSearchingGallery(false));
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, isOpen]);

  const entries = useMemo<Entry[]>(() => {
    const go = (view: ViewType) => () => onNavigate(view);
    const pages: Entry[] = [
      { id: 'p-dashboard', group: 'Go to', label: 'Dashboard', keywords: 'home overview credits used published', icon: LayoutDashboard, run: go('dashboard') },
      { id: 'p-image', group: 'Go to', label: 'Image Studio', keywords: 'picture photo poster create generate', icon: ImageIcon, run: go('image-studio') },
      { id: 'p-video', group: 'Go to', label: 'Video Studio', keywords: 'reel clip film create generate', icon: Video, run: go('video-studio') },
      { id: 'p-voice', group: 'Go to', label: 'Voice Studio', keywords: 'audio speech narration record voice hindi punjabi', icon: Mic, run: go('voice-studio') },
      { id: 'p-gallery', group: 'Go to', label: 'Gallery', keywords: 'history saved files media library created', icon: FolderOpen, run: go('media-library') },
      { id: 'p-calendar', group: 'Go to', label: 'Calendar', keywords: 'schedule posts publish', icon: Calendar, run: go('calendar') },
      { id: 'p-team', group: 'Go to', label: 'Team', keywords: 'members seats invite roles', icon: Users, run: go('team') },
      { id: 'p-integrations', group: 'Go to', label: 'Integrations', keywords: 'connect facebook instagram linkedin youtube accounts', icon: Layers, run: go('integrations') },
      { id: 'p-billing', group: 'Go to', label: 'Billing & Credits', keywords: 'plan upgrade renew pay price subscription', icon: CreditCard, run: go('billing') },
      { id: 'p-settings', group: 'Go to', label: 'Settings', keywords: 'theme dark workspace', icon: Settings, run: go('settings') },
      { id: 'p-profile', group: 'Go to', label: 'Profile', keywords: 'account password name', icon: UserIcon, run: go('profile') },
      { id: 'p-help', group: 'Go to', label: 'Help Center', keywords: 'faq guide tour support how', icon: HelpCircle, run: go('help') },
    ];

    const actions: Entry[] = canInvite
      ? [
          {
            id: 'a-invite',
            group: 'Do',
            label: 'Invite a teammate',
            hint: 'Opens the Team page with the invite form',
            keywords: 'add member seat',
            icon: UserPlus,
            run: () => {
              requestInviteForm();
              onNavigate('team');
            },
          },
        ]
      : [];

    const templates: Entry[] = VIDEO_PROMPT_TEMPLATES.map((t) => ({
      id: `t-${t.id}`,
      group: 'Video templates' as Group,
      label: t.title,
      hint: t.category,
      keywords: `${t.prompt} template prompt video`,
      icon: Wand2,
      run: () => {
        requestReuse({ studio: 'video', prompt: t.prompt });
        onNavigate('video-studio');
      },
    }));

    const gallery: Entry[] = galleryHits.map((item) => ({
      id: `g-${item.id}`,
      group: 'Your gallery' as Group,
      label: item.prompt ? item.prompt.slice(0, 90) : item.fileName,
      hint: `${TYPE_LABELS[item.type] ?? item.type}${item.createdByName ? ` · ${item.createdByName}` : ''}`,
      icon: item.type === 'audio' ? Mic : item.type === 'image' ? ImageIcon : Video,
      thumbnail: item.type === 'image' ? item.url : undefined,
      run: () => {
        requestGallerySearch(term);
        onNavigate('media-library');
      },
    }));

    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (entry: Entry) => {
      const haystack = `${entry.label} ${entry.hint ?? ''} ${entry.keywords ?? ''}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    };

    // With nothing typed, show where to go and what to do; templates appear once there is something to match.
    const staticEntries = words.length === 0 ? [...pages, ...actions] : [...pages, ...actions, ...templates].filter(matches);
    const merged = [...staticEntries, ...gallery];
    return GROUP_ORDER.flatMap((group) => merged.filter((entry) => entry.group === group)).slice(0, 24);
  }, [term, galleryHits, canInvite, onNavigate]);

  useEffect(() => {
    setActive(0);
  }, [term]);

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, isOpen]);

  if (!isOpen) return null;

  const choose = (entry: Entry | undefined) => {
    if (!entry) return;
    entry.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, entries.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(entries[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup: Group | null = null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, templates, and everything you have made..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            autoFocus
          />
          {searchingGallery && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="p-2 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              {searchingGallery ? 'Searching...' : 'Nothing found. Try a page name like "voice", or words from something you made.'}
            </div>
          ) : (
            entries.map((entry, index) => {
              const Icon = entry.icon;
              const showHeading = entry.group !== lastGroup;
              lastGroup = entry.group;
              const isActive = index === active;
              return (
                <React.Fragment key={entry.id}>
                  {showHeading && (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {entry.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-active={isActive}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(entry)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                      isActive ? 'bg-blue-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-200" />
                      ) : (
                        <span
                          className={`p-2 rounded-lg shrink-0 transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{entry.label}</p>
                        {entry.hint && <p className="text-[10px] text-slate-400 truncate">{entry.hint}</p>}
                      </div>
                    </div>
                    {isActive && <span className="text-[10px] text-slate-400 shrink-0">Enter ↵</span>}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↑↓</kbd>{' '}
              Move
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↵</kbd>{' '}
              Open
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">Esc</kbd>{' '}
              Close
            </span>
          </div>
          <span>Search</span>
        </div>
      </div>
    </div>
  );
};
