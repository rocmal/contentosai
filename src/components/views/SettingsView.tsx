import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, Moon, Settings, Sun } from 'lucide-react';
import { ViewType } from '../../types';
import { getMyOrganization, updateMyOrganization } from '../../lib/api';

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (view: ViewType) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  darkMode,
  onToggleDarkMode,
  onNavigate,
}) => {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganization()
      .then((org) => {
        if (org) {
          setOrgName(org.name);
          setOrgSlug(org.slug);
        }
      })
      .catch(() => {
        // No organization yet - the form just stays blank.
      })
      .finally(() => setLoaded(true));
  }, []);

  const handleSaveOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateMyOrganization({ name: orgName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Platform & Workspace Settings
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theme preferences and workspace details.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-w-2xl shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Appearance Theme</h3>
            <p className="text-[11px] text-slate-500">Switch between Light and Dark mode canvas</p>
          </div>

          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </div>

      {loaded && orgSlug && (
        <form
          onSubmit={handleSaveOrgName}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-w-2xl shadow-xs"
        >
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Workspace</h3>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Workspace name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <p className="text-[11px] text-slate-400">Slug: {orgSlug} (not editable)</p>

          {error && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
};
