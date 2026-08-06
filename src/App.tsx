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
import { TeamView } from './components/views/TeamView';
import { VideoStudioView } from './components/views/VideoStudioView';
import { VoiceStudioView } from './components/views/VoiceStudioView';
import { CharacterStudioView } from './components/views/CharacterStudioView';

import {
  initialAIAgents,
  initialBrandBrain,
  initialCalendarEvents,
  initialCampaigns,
  initialGenerations,
  initialProjects,
  initialWorkflowNodes,
} from './mockData';
import {
  AIAgent,
  BrandBrain,
  CalendarEvent,
  Campaign,
  GenerationHistoryItem,
  Project,
  ViewType,
  WorkflowNode,
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

/** Logged-out visitors get two real paths - "/" (LandingPage) and "/login"
 * (LoginView) - via plain pushState instead of a router dependency, since
 * server.ts already falls back to index.html for any unmatched path in both
 * dev (Vite's appType: 'spa') and prod (its explicit `app.get('*', ...)`). */
function getPublicRouteFromPath(): 'landing' | 'login' {
  return window.location.pathname === '/login' ? 'login' : 'landing';
}

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>(() => getViewFromHash() ?? 'dashboard');
  const [publicRoute, setPublicRoute] = useState<'landing' | 'login'>(() => getPublicRouteFromPath());
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  // Application Persistent State
  const [brandBrain, setBrandBrain] = useState<BrandBrain>(initialBrandBrain);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents);
  const [generations, setGenerations] = useState<GenerationHistoryItem[]>(initialGenerations);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>(initialWorkflowNodes);
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
  // views instead of doing nothing.
  useEffect(() => {
    if (window.location.hash.replace(/^#/, '') !== currentView) {
      window.location.hash = currentView;
    }
  }, [currentView]);

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

  const handleSaveToCalendar = (item: any) => {
    const newEv: CalendarEvent = {
      id: `cal-${Date.now()}`,
      title: item.title || 'Generated Post',
      platform: item.platform || 'LinkedIn',
      contentType: item.contentType || 'Post',
      scheduledTime: 'Tomorrow, 11:00 AM',
      status: 'Approved',
      author: 'Alex Rivera',
      previewText: item.previewText || '',
    };
    setCalendarEvents((prev) => [newEv, ...prev]);
  };

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
    return publicRoute === 'login' ? (
      <LoginView onBack={navigateToLanding} />
    ) : (
      <LandingPage onLoginClick={navigateToLogin} />
    );
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
          onToggleTheme={() => setDarkMode(!darkMode)}
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
              calendarEvents={calendarEvents}
              generations={generations}
            />
          )}

          {currentView === 'ai-studio' && (
            <AIStudioView
              brandBrain={brandBrain}
              onNavigate={(v) => setCurrentView(v)}
              onSaveToCalendar={handleSaveToCalendar}
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
            <CampaignsView
              campaigns={campaigns}
              onNavigate={(v) => setCurrentView(v)}
            />
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
            <AutomationView
              nodes={workflowNodes}
              onNavigate={(v) => setCurrentView(v)}
            />
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
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

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
