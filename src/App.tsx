import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommandPalette } from './components/CommandPalette';
import { FloatingAIAssistant } from './components/FloatingAIAssistant';
import { GuidedTourModal } from './components/GuidedTourModal';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { LoginView } from './components/LoginView';
import { MobileNav } from './components/MobileNav';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import { getMyBrandProfile, getSetting, setSetting } from './lib/api';

import { AIAgentsView } from './components/views/AIAgentsView';
import { AIStudioView } from './components/views/AIStudioView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AutomationView } from './components/views/AutomationView';
import { BillingView } from './components/views/BillingView';
import { BrandBrainView } from './components/views/BrandBrainView';
import { CampaignsView } from './components/views/CampaignsView';
import { ContentCalendarView } from './components/views/ContentCalendarView';
import { DashboardView } from './components/views/DashboardView';
import { HelpGuideView } from './components/views/HelpGuideView';
import { ImageStudioView } from './components/views/ImageStudioView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { MarketplaceView } from './components/views/MarketplaceView';
import { MediaLibraryView } from './components/views/MediaLibraryView';
import { ProjectsView } from './components/views/ProjectsView';
import { SettingsView } from './components/views/SettingsView';
import { ProfileView } from './components/views/ProfileView';
import { TeamView } from './components/views/TeamView';
import { VideoStudioView } from './components/views/VideoStudioView';
import { VoiceStudioView } from './components/views/VoiceStudioView';
import { CharacterStudioView } from './components/views/CharacterStudioView';

import {
  initialAIAgents,
  initialBrandBrain,
  initialProjects,
} from './mockData';
import {
  AIAgent,
  BrandBrain,
  Project,
  ViewType,
} from './types';

const VIEW_TYPES: ViewType[] = [
  'dashboard',
  'ai-studio',
  'projects',
  'campaigns',
  'calendar',
  'video-studio',
  'image-studio',
  'voice-studio',
  'character-studio',
  'brand-brain',
  'media-library',
  'automation',
  'ai-agents',
  'analytics',
  'marketplace',
  'team',
  'integrations',
  'billing',
  'settings',
  'profile',
  'help',
];

function isViewType(value: string): value is ViewType {
  return (VIEW_TYPES as string[]).includes(value);
}

/** Reads the current view straight out of the URL hash (e.g. "#video-studio")
 * so a bookmark/refresh/paste lands on the same screen instead of always
 * resetting to Dashboard - this app has no router, the hash is the only
 * thing that survives a full page load. */
function getViewFromHash(): ViewType | null {
  const hash = window.location.hash.replace(/^#/, '');
  return isViewType(hash) ? hash : null;
}

/** Logged-out visitors get three real paths - "/" (LandingPage), "/login",
 * and "/signup" (both LoginView, different initial mode) - via plain
 * pushState instead of a router dependency, since server.ts already falls
 * back to index.html for any unmatched path in both dev (Vite's appType:
 * 'spa') and prod (its explicit `app.get('*', ...)`). */
function getPublicRouteFromPath(): 'landing' | 'login' | 'signup' {
  if (window.location.pathname === '/login') return 'login';
  if (window.location.pathname === '/signup') return 'signup';
  return 'landing';
}

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>(() => getViewFromHash() ?? 'dashboard');
  const [publicRoute, setPublicRoute] = useState<'landing' | 'login' | 'signup'>(() => getPublicRouteFromPath());
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  // Application Persistent State
  // Starts as the local mock so every view has something to render
  // immediately; replaced by the real persisted profile (if any exists yet)
  // once the fetch below resolves.
  const [brandBrain, setBrandBrain] = useState<BrandBrain>(initialBrandBrain);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getMyBrandProfile().then((profile) => {
      if (!cancelled && profile) setBrandBrain(profile);
    }).catch(() => {
      // No brand profile yet, or a transient fetch error - the mock default stays as a starting point.
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Dark mode defaults to on (matches the previous hardcoded behavior) until
  // the workspace's persisted preference (if any) loads.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getSetting<boolean>('darkMode').then((value) => {
      if (!cancelled && typeof value === 'boolean') setDarkMode(value);
    }).catch(() => {
      // No saved preference yet, or a transient fetch error - the default stays.
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      setSetting('darkMode', next).catch(() => {
        // Best-effort persistence - the toggle still works locally even if this fails.
      });
      return next;
    });
  };

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>(initialAIAgents);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keep the URL hash in sync with the current view - lets a bookmark,
  // refresh, or pasted link (e.g. http://localhost:3000/#video-studio) open
  // directly to that screen, and makes browser back/forward move between
  // views instead of doing nothing. Only applies to the authenticated app -
  // otherwise this stamps a stale "#dashboard" onto the logged-out landing
  // page/login URL before anyone has actually navigated anywhere.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (window.location.hash.replace(/^#/, '') !== currentView) {
      window.location.hash = currentView;
    }
  }, [currentView, isAuthenticated]);

  // Strip any stray view hash (e.g. a leftover "#dashboard" from a prior
  // session) while logged out, since the landing page/login have no views.
  useEffect(() => {
    if (!isAuthenticated && window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const onHashChange = () => {
      const view = getViewFromHash();
      if (view) setCurrentView(view);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onPopState = () => setPublicRoute(getPublicRouteFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToLogin = () => {
    window.history.pushState({}, '', '/login');
    setPublicRoute('login');
  };

  const navigateToSignup = () => {
    window.history.pushState({}, '', '/signup');
    setPublicRoute('signup');
  };

  const navigateToLanding = () => {
    window.history.pushState({}, '', '/');
    setPublicRoute('landing');
  };

  // Land on Integrations after the Meta OAuth redirect (?meta_connected=1 /
  // ?meta_error=...) so the connect result is actually visible, even if the
  // callback redirect ever loses its #integrations hash for some reason.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('meta_connected') || params.has('meta_error')) {
      setCurrentView('integrations');
    }
  }, []);


  const handleRunQuickAI = (prompt: string) => {
    setCurrentView('ai-studio');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (publicRoute === 'login') {
      return <LoginView initialMode="signin" onBack={navigateToLanding} />;
    }
    if (publicRoute === 'signup') {
      return <LoginView initialMode="signup" onBack={navigateToLanding} />;
    }
    return <LandingPage onLoginClick={navigateToLogin} onSignupClick={navigateToSignup} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area Layout */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          theme={darkMode ? 'dark' : 'light'}
          onToggleTheme={toggleDarkMode}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onQuickGenerate={() => setCurrentView('ai-studio')}
          onStartTour={() => setIsTourOpen(true)}
        />

        {/* View Viewport Canvas */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(v) => setCurrentView(v)}
              projects={projects}
            />
          )}

          {currentView === 'ai-studio' && (
            <AIStudioView
              brandBrain={brandBrain}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'brand-brain' && (
            <BrandBrainView
              brandBrain={brandBrain}
              onUpdateBrandBrain={(nb) => setBrandBrain(nb)}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              projects={projects}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'campaigns' && (
            <CampaignsView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'calendar' && (
            <ContentCalendarView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'video-studio' && (
            <VideoStudioView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'image-studio' && (
            <ImageStudioView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'voice-studio' && (
            <VoiceStudioView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'character-studio' && (
            <CharacterStudioView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'media-library' && (
            <MediaLibraryView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'automation' && (
            <AutomationView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'ai-agents' && (
            <AIAgentsView
              agents={aiAgents}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'marketplace' && (
            <MarketplaceView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'team' && (
            <TeamView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'integrations' && (
            <IntegrationsView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'billing' && (
            <BillingView onNavigate={(v) => setCurrentView(v)} />
          )}

          {currentView === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'profile' && <ProfileView />}

          {currentView === 'help' && (
            <HelpGuideView
              onNavigate={(v) => setCurrentView(v)}
              onStartTour={() => setIsTourOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Guided Tour Modal Popup */}
      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigate={(v) => setCurrentView(v)}
        onOpenVideoTutorial={() => setCurrentView('help')}
      />

      {/* Floating Elements */}
      <FloatingAIAssistant currentView={currentView} />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(v) => setCurrentView(v)}
        onRunQuickAI={handleRunQuickAI}
      />

      <MobileNav
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />
    </div>
  );
}

export default App;
