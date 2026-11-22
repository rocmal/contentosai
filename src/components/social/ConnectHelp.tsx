import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, HelpCircle, X } from 'lucide-react';
import { ConnectGuideId, connectGuide, guideUrl } from '../../lib/connectGuides';

/**
 * The (?) next to a Connect button: the short connect steps in a small panel, and a link to the full guide page
 * (/guides/<id>, which opens without signing in so it can also be sent to someone).
 */
export const ConnectHelp: React.FC<{ guide: ConnectGuideId; className?: string }> = ({ guide, className }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const g = connectGuide(guide);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={box} className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`How to connect ${g.name}`}
        aria-expanded={open}
        title={`How to connect ${g.name}`}
        className="p-0.5 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[300px] max-w-[85vw] p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl text-left">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-bold text-slate-900 dark:text-white">How to connect {g.name}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {g.needs.length > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">You need: {g.needs[0]}</p>
          )}
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-700 dark:text-slate-200">
            {g.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a
            href={guideUrl(guide)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Full guide, with help for common problems <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </span>
  );
};

/** A plain "How to connect" link to the guide, for a channel page that is not connected yet. */
export const ConnectGuideLink: React.FC<{ guide: ConnectGuideId }> = ({ guide }) => (
  <a
    href={guideUrl(guide)}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
  >
    How to connect <ExternalLink className="w-3 h-3" />
  </a>
);
