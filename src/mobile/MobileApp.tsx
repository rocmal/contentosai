import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';
import './mobile.css';
import { OnboardingScreen } from './OnboardingScreen';
import { MobileLoginScreen } from './MobileLoginScreen';
import { BottomTabBar } from './BottomTabBar';
import { HomeTab } from './HomeTab';
import { CalendarTab } from './CalendarTab';
import { StudioTab } from './StudioTab';
import { ProfileTab } from './ProfileTab';
import { CreateOverlay } from './CreateOverlay';
import { NotificationsOverlay } from './NotificationsOverlay';
import { PostDetailSheet } from './PostDetailSheet';
import { useMobilePosts, todayKey } from './useMobilePosts';
import { useMobileNotifications } from './useMobileNotifications';
import { MobilePost, MobileTab, StudioTab as StudioTabKey } from './types';

const ONBOARDING_SEEN_KEY = 'lumora_mobile_onboarding_seen';

/** The mobile app shell, reached at /m - a self-contained, native-app-style
 * experience (onboarding carousel, its own login screen, a bottom tab bar
 * with a Create FAB) distinct from the desktop dashboard's responsive
 * MobileNav. See design_handoff_mobile_app/README.md for the design brief
 * this implements and the scope notes (what's wired to real data vs.
 * still local/mock pending backend support). */
export const MobileApp: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_SEEN_KEY) === '1',
  );

  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [studioTab, setStudioTab] = useState<StudioTabKey>('video');
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MobilePost | null>(null);

  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [wallet, setWallet] = useState<api.CreditWallet | null>(null);
  const { posts, loading: postsLoading } = useMobilePosts();
  const notifications = useMobileNotifications();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    api.getMyOrganization().then((org) => {
      if (!cancelled && org) setOrganizationName(org.name);
    }).catch(() => {
      // No organization yet, or a transient error - the fallback label below covers it.
    });
    api.getMyCreditWallet().then((w) => {
      if (!cancelled) setWallet(w);
    }).catch(() => {
      // No wallet yet - the Credits card just shows a loading dash.
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const dismissOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    setOnboardingSeen(true);
  };

  const goTab = (tab: MobileTab) => {
    setActiveTab(tab);
    setShowCreate(false);
    setShowNotifications(false);
    setSelectedPost(null);
  };

  const handleSignOut = () => {
    logout().finally(() => goTab('home'));
  };

  if (isLoading) {
    return (
      <div className="lumora-mobile min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="lumora-mobile min-h-screen flex flex-col bg-white font-sans">
        {onboardingSeen ? <MobileLoginScreen /> : <OnboardingScreen onDone={dismissOnboarding} />}
      </div>
    );
  }

  return (
    <div className="lumora-mobile min-h-screen flex flex-col bg-white font-sans relative">
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'home' && (
          <HomeTab
            firstName={user!.firstName}
            workspaceName={organizationName ?? 'Your workspace'}
            wallet={wallet}
            posts={posts}
            postsLoading={postsLoading}
            todayKey={todayKey()}
            unreadNotifications={notifications.unreadCount}
            onOpenNotifications={() => setShowNotifications(true)}
            onOpenCreate={() => setShowCreate(true)}
            onNavigateTab={goTab}
            onOpenPost={setSelectedPost}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            posts={posts}
            postsLoading={postsLoading}
            onOpenCreate={() => setShowCreate(true)}
            onOpenPost={setSelectedPost}
          />
        )}
        {activeTab === 'studio' && (
          <StudioTab activeSubTab={studioTab} onSelectSubTab={setStudioTab} onOpenCreate={() => setShowCreate(true)} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab user={user!} workspaceName={organizationName ?? 'Your workspace'} wallet={wallet} onSignOut={handleSignOut} />
        )}
      </div>

      <BottomTabBar activeTab={activeTab} onNavigate={goTab} onCreate={() => setShowCreate(true)} />

      {showCreate && <CreateOverlay onClose={() => setShowCreate(false)} />}
      {showNotifications && (
        <NotificationsOverlay
          today={notifications.today}
          earlier={notifications.earlier}
          loading={notifications.loading}
          error={notifications.error}
          onMarkRead={notifications.markRead}
          onClose={() => setShowNotifications(false)}
        />
      )}
      {selectedPost && <PostDetailSheet post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
};

export default MobileApp;
