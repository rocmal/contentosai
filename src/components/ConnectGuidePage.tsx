import React from 'react';
import { LegalPageLayout } from './LegalPage';
import { CONNECT_GUIDES, ConnectGuideId, SUPPORT_EMAIL, connectGuide, guideUrl } from '../lib/connectGuides';

/**
 * Public help pages for connecting the publishing accounts: /guides (the list) and /guides/<id>. They open without
 * signing in - like /privacy and /terms - so the link can be sent to a customer. Linked from the (?) next to each
 * Connect button (ConnectHelp) and from Help & Tutorial. Content: src/lib/connectGuides.ts.
 */
export function guideIdFromPath(pathname: string): ConnectGuideId | null {
  const id = pathname.replace(/^\/guides\/?/, '').replace(/\/$/, '');
  return CONNECT_GUIDES.some((g) => g.id === id) ? (id as ConnectGuideId) : null;
}

export const ConnectGuidePage: React.FC<{ guideId: ConnectGuideId | null; onBack: () => void }> = ({
  guideId,
  onBack,
}) => {
  if (!guideId) {
    return (
      <LegalPageLayout title="Connect your accounts" subtitle="Step-by-step help for Lumora" onBack={onBack}>
        <section>
          <p>Lumora posts to your social accounts once you connect them in Integrations. Pick the account:</p>
          <ul>
            {CONNECT_GUIDES.map((g) => (
              <li key={g.id}>
                <a href={guideUrl(g.id)}>{g.title}</a> - {g.intro}
              </li>
            ))}
          </ul>
        </section>
      </LegalPageLayout>
    );
  }

  const g = connectGuide(guideId);
  return (
    <LegalPageLayout title={g.title} subtitle="Lumora help · connecting your accounts" onBack={onBack}>
      <section>
        <p>{g.intro}</p>
      </section>

      {g.videoUrl && (
        <section>
          <h2>Watch how</h2>
          <video src={g.videoUrl} controls preload="metadata" className="w-full rounded-xl border border-white/10" />
        </section>
      )}

      <section>
        <h2>What you need</h2>
        <ul>
          {g.needs.map((need) => (
            <li key={need}>{need}</li>
          ))}
        </ul>
      </section>

      {g.setup && (
        <section>
          <h2>{g.setup.title}</h2>
          <ol className="list-decimal pl-5 space-y-1.5">
            {g.setup.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h2>How to connect</h2>
        <ol className="list-decimal pl-5 space-y-1.5">
          {g.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>After connecting</h2>
        <ul>
          {g.after.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>If something goes wrong</h2>
        {g.problems.map((problem) => (
          <div key={problem.q} className="mb-4">
            <p className="font-semibold text-white !mb-1">{problem.q}</p>
            <p>{problem.a}</p>
          </div>
        ))}
        <p>
          Still stuck? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <p>
          Other guides:{' '}
          {CONNECT_GUIDES.filter((other) => other.id !== g.id).map((other, i) => (
            <React.Fragment key={other.id}>
              {i > 0 && ' · '}
              <a href={guideUrl(other.id)}>{other.name}</a>
            </React.Fragment>
          ))}
        </p>
      </section>
    </LegalPageLayout>
  );
};
