import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Lock, Pencil, Plus, Shield, Trash2, X } from 'lucide-react';
import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  Permission,
  Role,
  RoleInput,
  updateRole,
} from '../../../lib/api';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface RoleFormState {
  id: string | null; // null = creating a new role
  name: string;
  slug: string;
  description: string;
  permissionSlugs: Set<string>;
}

const emptyForm: RoleFormState = { id: null, name: '', slug: '', description: '', permissionSlugs: new Set() };

export const RolesPanel: React.FC = () => {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [roleList, permissionList] = await Promise.all([listRoles(), listPermissions()]);
      setRoles(roleList);
      setPermissions(permissionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const permissionsByModule = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = groups.get(p.module) ?? [];
      list.push(p);
      groups.set(p.module, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const startCreate = () => setForm({ ...emptyForm, permissionSlugs: new Set() });

  const startEdit = (role: Role) =>
    setForm({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description ?? '',
      permissionSlugs: new Set(role.permissionSlugs),
    });

  const togglePermission = (slug: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.permissionSlugs);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return { ...prev, permissionSlugs: next };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const input: RoleInput = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || undefined,
        permissionSlugs: Array.from(form.permissionSlugs),
      };
      if (form.id) {
        await updateRole(form.id, input);
      } else {
        await createRole(input);
      }
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    setDeletingId(role.id);
    setError(null);
    try {
      await deleteRole(role.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          System roles (Super Admin, Member) apply to every workspace and can't be edited. Create your own custom
          roles to grant a narrower set of permissions.
        </p>
        <button
          onClick={startCreate}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {form && (
        <form
          onSubmit={handleSave}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {form.id ? 'Edit role' : 'Create a custom role'}
            </h3>
            <button type="button" onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((prev) =>
                    prev
                      ? { ...prev, name: e.target.value, slug: prev.id ? prev.slug : slugify(e.target.value) }
                      : prev,
                  )
                }
                placeholder="Content Editor"
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Slug</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, slug: slugify(e.target.value) } : prev))}
                placeholder="content-editor"
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              placeholder="What this role is for"
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">
              Permissions ({form.permissionSlugs.size} selected)
            </label>
            <div className="max-h-80 overflow-y-auto custom-scroll space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {permissionsByModule.map(([module, perms]) => (
                <div key={module}>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{module}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer"
                        title={p.description ?? undefined}
                      >
                        <input
                          type="checkbox"
                          checked={form.permissionSlugs.has(p.slug)}
                          onChange={() => togglePermission(p.slug)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {form.id ? 'Save changes' : 'Create role'}
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {roles === null ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : roles.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">No roles found.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {roles.map((role) => (
              <div key={role.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span
                    className={`p-1.5 rounded-lg shrink-0 ${role.isSystem ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'}`}
                  >
                    {role.isSystem ? <Lock className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {role.name}
                      {role.isSystem && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          System
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {role.description || role.slug} · {role.permissionSlugs.length} permission
                      {role.permissionSlugs.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {!role.isSystem && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(role)}
                      title="Edit role"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      disabled={deletingId === role.id}
                      title="Delete role"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                    >
                      {deletingId === role.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
