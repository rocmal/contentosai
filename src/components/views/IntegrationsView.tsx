import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Facebook,
  Instagram,
  Layers,
  Linkedin,
  Loader2,
  Power,
  Youtube,
} from 'lucide-react';
import { ViewType } from '../../types';
import * as api from '../../lib/api';

interface IntegrationsViewProps {
  onNavigate: (view: ViewType) => void;
}

type ConnectBannerStatus = { kind: 'connected' } | { kind: 'error'; message: string } | null;

type SetupStepOwner = 'you' | 'admin';

const OWNER_BADGE: Record<SetupStepOwner, { label: string; className: string }> = {
  you: {
    label: 'YOU · EVERY ACCOUNT',
    className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  admin: {
    label: 'ADMIN · ONE-TIME',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
};

/** Steps that must happen on Meta's own site - no third-party app, Lumora
 * included, can create a Meta Developer App or grant API permissions on your
 * behalf.
 *
 * Ownership is intentionally split and labelled: steps 1-2 (and the final
 * Connect click below) are things every user does for their own Instagram
 * account - Lumora already stores each workspace's connection separately.
 * The middle steps are the Meta Developer App itself, which - like "Sign in
 * with Google" - only needs to exist ONCE per deployment. Whoever manages
 * this Lumora instance does those once; nobody else ever touches the .env
 * file. */
const SETUP_STEPS: { title: string; owner: SetupStepOwner; body: React.ReactNode }[] = [
  {
    title: 'Make your Instagram a Professional account',
    owner: 'you',
    body: (
      <>
        In the Instagram app: Settings → Account type and tools → Switch to Professional Account
        (Business or Creator). Personal accounts can't use the API at all.
      </>
    ),
  },
  {
    title: 'Link it to a Facebook Page you admin',
    owner: 'you',
    body: (
      <>
        Still in Instagram settings, connect a Facebook Page (create one first if you don't have
        one). Instagram publishing always goes through a linked Page - there's no way around this
        on Meta's side.
      </>
    ),
  },
  {
    title: 'Create a Meta Developer App',
    owner: 'admin',
    body: (
      <>
        Go to{' '}
        <a
          href="https://developers.facebook.com/apps"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
        >
          developers.facebook.com/apps <ExternalLink className="w-3 h-3" />
        </a>{' '}
        → Create App. On the "Add use cases" screen, none of the Featured tiles (Marketing API,
        Threads, WhatsApp, etc.) is Instagram - open the <strong>Others</strong> filter and pick{' '}
        <strong>"Other"</strong>, then choose app type <strong>Business</strong>. One app covers
        every user of this Lumora instance - it does not get recreated per person.
      </>
    ),
  },
  {
    title: 'Add the Instagram product, with Facebook login',
    owner: 'admin',
    body: (
      <>
        From the new app's dashboard, scroll to <strong>Instagram</strong> and click{' '}
        <strong>Set up</strong>. You'll be offered two paths - "API setup with Instagram login"
        and "API setup with Facebook login". Choose{' '}
        <strong>API setup with Facebook login</strong> - that's the one that matches what's
        already built in Lumora (a Page access token, working with an Instagram Business account
        linked to a Facebook Page). It pulls in Facebook Login automatically, so there's nothing
        else to add from the use-case screen.
      </>
    ),
  },
  {
    title: 'Add testers (skip App Review)',
    owner: 'admin',
    body: (
      <>
        In App Roles → Roles, add each Facebook account that needs to connect (yourself, and
        teammates who'll use Integrations) as Admin or Tester. This lets everyone added use the
        API immediately in Development Mode - Meta's App Review (which takes weeks) is only
        required to publish on behalf of accounts <em>not</em> added to the app.
      </>
    ),
  },
  {
    title: "Copy the app's ID/Secret into the backend",
    owner: 'admin',
    body: (
      <>
        From the App Dashboard's Settings → Basic page, copy the App ID and App Secret into{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
          apps/api/.env.development
        </code>{' '}
        as <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">META_APP_ID</code>{' '}
        and{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">META_APP_SECRET</code>.
        Also set{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">META_REDIRECT_URI</code>{' '}
        to <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
          &lt;public-https-url&gt;/api/v1/integrations/meta/callback
        </code>{' '}
        and add that exact same URL under Facebook Login → Settings → Valid OAuth Redirect URIs -
        it must match exactly. This is one shared value for the whole app, the same way an app's
        Google OAuth client ID isn't different per user.
        <br />
        <br />
        Meta requires HTTPS, and won't accept <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">localhost</code>,
        so pick one:
        <br />
        <strong>Local development</strong> - keep the backend on localhost, expose it with a
        tunnel: Cloudflare Tunnel, ngrok, or LocalTunnel (e.g.{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">ngrok http 3000</code>{' '}
        gives you something like{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
          https://lumora-dev.trycloudflare.com/api/v1/integrations/meta/callback
        </code>
        ).
        <br />
        <strong>Deployed</strong> - once the API is running somewhere with a real domain (a VPS,
        Railway, Fly.io, Render, AWS, Azure), use that instead, e.g.{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
          https://api.lumora.ai/api/v1/integrations/meta/callback
        </code>
        - no tunnel needed at that point.
      </>
    ),
  },
  {
    title: 'Restart the backend',
    owner: 'admin',
    body: (
      <>
        Restart the API so it picks up the new env vars. From this point on, the admin part is
        done for good - nobody, including you, needs to repeat the app-creation steps again.
      </>
    ),
  },
  {
    title: 'Click "Connect Facebook & Instagram" below',
    owner: 'you',
    body: (
      <>
        This is the part every person does individually, for their own account. You'll be sent to
        Facebook's login dialog and back - once it says Connected, videos you schedule from Video
        Studio publish automatically. Each user's connection is stored separately, so teammates
        connect their own accounts the same way, whenever they're ready.
      </>
    ),
  },
];

const SetupGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const envSnippet = 'META_APP_ID=\nMETA_APP_SECRET=\nMETA_REDIRECT_URI=\nMETA_GRAPH_API_VERSION=v21.0';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(envSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied - non-critical, user can still select/copy manually.
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          How do I set this up? (admin does this once, then anyone can connect)
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 animate-in fade-in duration-150">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Meta requires every app that publishes to Instagram to have its own registered
            developer app and credentials - this can't be done from inside Lumora (or any
            third-party tool). Only <strong className="text-slate-700 dark:text-slate-300">one
            person</strong> needs to do that part, <strong className="text-slate-700 dark:text-slate-300">once</strong>,
            for the whole team (marked <span className="text-amber-600 dark:text-amber-400 font-semibold">ADMIN · ONE-TIME</span>{' '}
            below) - it's the same pattern as "Sign in with Google" needing one registered app,
            not one per person. Connecting your own account (marked{' '}
            <span className="text-blue-600 dark:text-blue-400 font-semibold">YOU · EVERY ACCOUNT</span>) is
            already per-user and just needs a click, once the admin part exists.
          </p>

          <ol className="space-y-3">
            {SETUP_STEPS.map((step, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{step.title}</p>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide ${OWNER_BADGE[step.owner].className}`}
                    >
                      {OWNER_BADGE[step.owner].label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                apps/api/.env.development
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 hover:text-blue-300"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {envSnippet}
            </pre>
          </div>

          <p className="text-[10px] text-slate-400">
            Full technical reference: "Scheduled/automated social publishing" section in{' '}
            <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">apps/api/README.md</code>.
          </p>
        </div>
      )}
    </div>
  );
};

/** Facebook/Instagram publishing connection, backed by the real Meta OAuth
 * flow (GET /integrations/meta/connect + /callback) - everything else on
 * this page remains the pre-existing illustrative mock list. */
const SocialPublishingConnect: React.FC = () => {
  const [status, setStatus] = useState<Record<api.SocialPlatform, api.SocialConnectionStatus> | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [banner, setBanner] = useState<ConnectBannerStatus>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaError = params.get('meta_error');
    const metaConnected = params.get('meta_connected');
    if (metaConnected) {
      setBanner({ kind: 'connected' });
    } else if (metaError) {
      setBanner({ kind: 'error', message: decodeURIComponent(metaError) });
    }
    if (metaConnected || metaError) {
      params.delete('meta_connected');
      params.delete('meta_error');
      const query = params.toString();
      // Preserve the #integrations hash (App.tsx's view routing) - only the
      // one-shot meta_connected/meta_error query params need cleaning up.
      window.history.replaceState(
        null,
        '',
        window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
      );
    }

    api
      .getSocialConnectionStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          facebook: { connected: false },
          instagram: { connected: false },
          linkedin: { connected: false },
          youtube: { connected: false },
        }),
      )
      .finally(() => setIsLoadingStatus(false));
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const url = await api.getMetaConnectUrl();
      window.location.href = url;
    } catch (err) {
      setBanner({
        kind: 'error',
        message: err instanceof api.ApiError ? err.message : 'Could not start the Meta connect flow.',
      });
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Publishing</span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Facebook & Instagram</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Required for scheduled/automated posting from Video Studio.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1877F2] hover:opacity-90 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
        >
          {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          <span>Connect Facebook & Instagram</span>
        </button>
      </div>

      {banner?.kind === 'connected' && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
          <Check className="w-3.5 h-3.5 shrink-0" /> Connected successfully.
        </div>
      )}
      {banner?.kind === 'error' && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {banner.message}
        </div>
      )}

      <SetupGuide />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(
          [
            { id: 'facebook' as const, label: 'Facebook Page', Icon: Facebook },
            { id: 'instagram' as const, label: 'Instagram Business', Icon: Instagram },
          ]
        ).map(({ id, label, Icon }) => {
          const platformStatus = status?.[id];
          const connected = !!platformStatus?.connected;
          return (
            <div
              key={id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
                  {connected && platformStatus?.label && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {platformStatus.label}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                  isLoadingStatus
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : connected
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {isLoadingStatus ? '...' : connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OTHER_PLATFORMS = [
  {
    id: 'linkedin' as const,
    label: 'LinkedIn',
    Icon: Linkedin,
    color: '#0A66C2',
    getConnectUrl: api.getLinkedInConnectUrl,
  },
  {
    id: 'youtube' as const,
    label: 'YouTube',
    Icon: Youtube,
    color: '#FF0000',
    getConnectUrl: api.getYouTubeConnectUrl,
  },
];

/** LinkedIn (posts as the connected member) + YouTube (video upload)
 * publishing connections, each its own OAuth flow (GET /integrations/
 * linkedin|youtube/connect + /callback) unlike Facebook/Instagram which
 * share one Meta login. Status comes from the same combined
 * getSocialConnectionStatus() call as SocialPublishingConnect above. */
const LinkedInYouTubeConnect: React.FC = () => {
  const [status, setStatus] = useState<Record<api.SocialPlatform, api.SocialConnectionStatus> | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [banners, setBanners] = useState<Record<string, ConnectBannerStatus>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextBanners: Record<string, ConnectBannerStatus> = {};
    let touched = false;
    for (const platform of ['linkedin', 'youtube']) {
      const connected = params.get(`${platform}_connected`);
      const error = params.get(`${platform}_error`);
      if (connected) {
        nextBanners[platform] = { kind: 'connected' };
        params.delete(`${platform}_connected`);
        touched = true;
      } else if (error) {
        nextBanners[platform] = { kind: 'error', message: decodeURIComponent(error) };
        params.delete(`${platform}_error`);
        touched = true;
      }
    }
    if (touched) {
      setBanners(nextBanners);
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
      );
    }

    api
      .getSocialConnectionStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          facebook: { connected: false },
          instagram: { connected: false },
          linkedin: { connected: false },
          youtube: { connected: false },
        }),
      )
      .finally(() => setIsLoadingStatus(false));
  }, []);

  const handleConnect = async (platform: string, getConnectUrl: () => Promise<string>) => {
    setConnectingId(platform);
    try {
      const url = await getConnectUrl();
      window.location.href = url;
    } catch (err) {
      setBanners((prev) => ({
        ...prev,
        [platform]: {
          kind: 'error',
          message: err instanceof api.ApiError ? err.message : `Could not start the ${platform} connect flow.`,
        },
      }));
      setConnectingId(null);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">Publishing</span>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">LinkedIn & YouTube</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          LinkedIn posts as your connected profile; YouTube requires a video.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OTHER_PLATFORMS.map(({ id, label, Icon, color, getConnectUrl }) => {
          const platformStatus = status?.[id];
          const connected = !!platformStatus?.connected;
          const banner = banners[id];
          return (
            <div
              key={id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
                    {connected && platformStatus?.label && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {platformStatus.label}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                    isLoadingStatus
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : connected
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isLoadingStatus ? '...' : connected ? 'Connected' : 'Not connected'}
                </span>
              </div>

              {banner?.kind === 'connected' && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                  <Check className="w-3 h-3 shrink-0" /> Connected successfully.
                </div>
              )}
              {banner?.kind === 'error' && (
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-[10px]">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {banner.message}
                </div>
              )}

              <button
                onClick={() => handleConnect(id, getConnectUrl)}
                disabled={connectingId === id}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold shadow-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: color }}
              >
                {connectingId === id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Power className="w-3 h-3" />
                )}
                <span>{connected ? `Reconnect ${label}` : `Connect ${label}`}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// AI engines are server-side API-key configs, not a per-workspace OAuth
// "connect" - so this is a read-only status (is the key set?) sourced from
// the AI/Voice provider health checks, not an interactive toggle.
const AI_ENGINE_ITEMS: { id: string; name: string; category: string; source: 'ai' | 'voice' }[] = [
  { id: 'gemini', name: 'Gemini', category: 'AI Engine', source: 'ai' },
  { id: 'openai', name: 'OpenAI GPT', category: 'AI Engine', source: 'ai' },
  { id: 'elevenlabs', name: 'ElevenLabs Voice', category: 'Audio Synthesis', source: 'voice' },
];

// No backend integration exists for any of these yet (no OAuth flow, no
// provider adapter) - shown as an honest static list rather than a toggle
// that doesn't actually connect anything.
const NOT_YET_CONNECTED_ITEMS: { id: string; name: string; category: string }[] = [
  { id: 'slack', name: 'Slack Notifications', category: 'Operations' },
  { id: 'hubspot', name: 'HubSpot CRM', category: 'Lead Gen' },
  { id: 'stripe', name: 'Stripe Billing API', category: 'Finance' },
];

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ onNavigate }) => {
  const [aiStatuses, setAiStatuses] = useState<Record<string, boolean> | null>(null);
  const [voiceStatuses, setVoiceStatuses] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    api.getAiProviderStatuses()
      .then((statuses) => setAiStatuses(Object.fromEntries(statuses.map((s) => [s.name, s.available]))))
      .catch(() => setAiStatuses({}));
    api.getVoiceProviderStatuses()
      .then((statuses) => setVoiceStatuses(Object.fromEntries(statuses.map((s) => [s.name, s.available]))))
      .catch(() => setVoiceStatuses({}));
  }, []);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Connected APIs & Publishing Integrations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Connect AI model providers, social publishing accounts, and CRM webhooks.
          </p>
        </div>
      </div>

      <SocialPublishingConnect />

      <LinkedInYouTubeConnect />

      <div className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          AI Engines - configured on the server
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_ENGINE_ITEMS.map((item) => {
            const statuses = item.source === 'ai' ? aiStatuses : voiceStatuses;
            const available = statuses?.[item.id];
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs"
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.category}</span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h3>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 ${
                    statuses === null
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : available
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {statuses === null ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Power className="w-3 h-3" />
                  )}
                  <span>{statuses === null ? 'Checking...' : available ? 'Configured' : 'Not configured'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Not Yet Connected
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NOT_YET_CONNECTED_ITEMS.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between opacity-75"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.category}</span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h3>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
