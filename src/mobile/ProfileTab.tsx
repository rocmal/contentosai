import React from 'react';
import {
  Bookmark,
  Bot,
  BarChart3,
  CreditCard,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LogOut,
  Megaphone,
  Mic,
  Settings,
  Store,
  UserRound,
  Users as UsersIcon,
  Zap,
} from 'lucide-react';
import * as api from '../lib/api';

interface ProfileTabProps {
  user: api.AuthUser;
  workspaceName: string;
  wallet: api.CreditWallet | null;
  onSignOut: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  bg: string;
  color: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const GROUPS: MenuGroup[] = [
  {
    label: 'Studios',
    items: [
      { label: 'Image Studio', href: '/#image-studio', icon: ImageIcon, bg: 'bg-blue-50', color: 'text-blue-700' },
      { label: 'Voice Studio', href: '/#voice-studio', icon: Mic, bg: 'bg-emerald-50', color: 'text-emerald-600' },
      { label: 'Character Studio', href: '/#character-studio', icon: UserRound, bg: 'bg-blue-100', color: 'text-blue-700' },
      { label: 'Brand Brain', href: '/#brand-brain', icon: Bookmark, bg: 'bg-slate-50', color: 'text-slate-600' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Projects', href: '/#projects', icon: FolderOpen, bg: 'bg-blue-50', color: 'text-blue-700' },
      { label: 'Campaigns', href: '/#campaigns', icon: Megaphone, bg: 'bg-emerald-50', color: 'text-emerald-600' },
      { label: 'Analytics', href: '/#analytics', icon: BarChart3, bg: 'bg-emerald-100', color: 'text-emerald-600' },
      { label: 'Team', href: '/#team', icon: UsersIcon, bg: 'bg-slate-50', color: 'text-slate-600' },
      { label: 'Integrations', href: '/#integrations', icon: Layers, bg: 'bg-slate-200', color: 'text-slate-600' },
      { label: 'Automation', href: '/#automation', icon: Zap, bg: 'bg-blue-100', color: 'text-blue-700' },
      { label: 'AI Agents', href: '/#ai-agents', icon: Bot, bg: 'bg-slate-50', color: 'text-slate-600' },
      { label: 'Marketplace', href: '/#marketplace', icon: Store, bg: 'bg-blue-50', color: 'text-blue-700' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Billing & Credits', href: '/#billing', icon: CreditCard, bg: 'bg-blue-50', color: 'text-blue-700' },
      { label: 'Settings', href: '/#settings', icon: Settings, bg: 'bg-slate-200', color: 'text-slate-600' },
      { label: 'Help & Support', href: '/#help', icon: HelpCircle, bg: 'bg-slate-50', color: 'text-slate-600' },
    ],
  },
];

export const ProfileTab: React.FC<ProfileTabProps> = ({ user, workspaceName, wallet, onSignOut }) => {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="px-5 pt-3.5 pb-6">
      <div className="flex items-center gap-3 mb-[18px]">
        <div className="w-[52px] h-[52px] rounded-full bg-blue-600 text-white flex items-center justify-center font-display text-[17px] flex-none">
          {initials || <UserRound className="w-6 h-6" />}
        </div>
        <div>
          <div className="text-[15px] font-bold text-slate-900">{fullName || user.email}</div>
          <div className="text-xs text-slate-500">{workspaceName} · Admin</div>
        </div>
      </div>

      <a
        href="/#billing"
        className="bg-blue-950 rounded-2xl px-4 py-3.5 flex items-center justify-between mb-[22px]"
      >
        <div>
          <div className="text-[11px] text-blue-300 uppercase font-bold tracking-wide">Credits</div>
          <div className="font-display text-lg text-white">
            {wallet ? (wallet.balance === null ? 'Unlimited' : `${wallet.balance.toLocaleString()} remaining`) : 'Loading…'}
          </div>
        </div>
        <span className="text-[11.5px] font-bold text-emerald-200">View plan</span>
      </a>

      {GROUPS.map((grp) => (
        <div key={grp.label} className="mb-[18px]">
          <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2">{grp.label}</div>
          <div className="flex flex-col gap-0.5 bg-slate-100 rounded-2xl overflow-hidden">
            {grp.items.map((it) => (
              <a key={it.label} href={it.href} className="flex items-center gap-3 px-3.5 py-3">
                <div className={`w-[34px] h-[34px] rounded-[11px] flex items-center justify-center ${it.bg}`}>
                  <it.icon className={`w-4 h-4 ${it.color}`} />
                </div>
                <span className="text-[13px] font-semibold text-slate-900 flex-1">{it.label}</span>
              </a>
            ))}
          </div>
        </div>
      ))}

      <button onClick={onSignOut} className="flex items-center gap-2.5 px-3.5 py-3 bg-transparent">
        <LogOut className="w-4 h-4 text-slate-600" />
        <span className="text-[13px] font-bold text-slate-600">Sign out</span>
      </button>
    </div>
  );
};
