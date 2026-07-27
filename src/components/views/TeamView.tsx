import React from 'react';
import { Plus, Users } from 'lucide-react';
import { ViewType } from '../../types';

interface TeamViewProps {
  onNavigate: (view: ViewType) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ onNavigate }) => {
  const members = [
    {
      id: 'u1',
      name: 'Alex Rivera',
      email: 'alex@acmetech.io',
      role: 'Owner & Creative Director',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'u2',
      name: 'Sarah Chen',
      email: 'sarah@acmetech.io',
      role: 'Content Strategist',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'u3',
      name: 'Marcus Vance',
      email: 'marcus@acmetech.io',
      role: 'Video Producer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
  ];

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
          onClick={() => alert('Invite link copied to clipboard!')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" /> Invite Teammate
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</h4>
                  <p className="text-[11px] text-slate-400">{m.email}</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
