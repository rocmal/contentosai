import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2, Users, X } from 'lucide-react';
import { ViewType } from '../../types';
import { addTeamMemberById, listRoles, listTeamMembers, removeTeamMember, Role, TeamMember } from '../../lib/api';

interface TeamViewProps {
  onNavigate: (view: ViewType) => void;
}

export const TeamView: React.FC<TeamViewProps> = () => {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [teamMembers, roleList] = await Promise.all([listTeamMembers(), listRoles()]);
      setMembers(teamMembers);
      setRoles(roleList);
      if (!newRoleId && roleList.length > 0) setNewRoleId(roleList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newRoleId) return;
    setAdding(true);
    setError(null);
    try {
      await addTeamMemberById(newUserId.trim(), newRoleId);
      setNewUserId('');
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setMembers((prev) => prev?.filter((m) => m.userId !== userId) ?? prev);
    try {
      await removeTeamMember(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member');
      await load();
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Team Members & Workspace Roles
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage collaborative seats, permissions, and Brand Brain access.
          </p>
        </div>

        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Teammate
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add existing user to this workspace</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            There's no email-invite flow yet - the teammate needs to sign up first, then you add them here by their
            user ID.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">User ID</label>
              <input
                type="text"
                required
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Role</label>
              <select
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                className="text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add to workspace
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {members === null ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">No team members found.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <div key={m.membershipId} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(m.firstName[0] ?? m.email[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {`${m.firstName} ${m.lastName}`.trim() || m.email}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {m.roleName}
                  </span>
                  <button
                    onClick={() => handleRemove(m.userId)}
                    title="Remove from workspace"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
