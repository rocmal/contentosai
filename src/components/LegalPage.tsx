import React from 'react';
import { Logo, Wordmark } from './Logo';

const EFFECTIVE_DATE = 'October 23, 2026';
const CONTACT_EMAIL = 'sales@lumoraos.in';
const SITE = 'lumoraos.in';

interface LegalPageProps {
  onBack: () => void;
}

/** Shared chrome for the standalone legal pages (Privacy Policy, Terms of
 * Service) - these are public, unauthenticated routes (see App.tsx's
 * getPublicRouteFromPath) so they intentionally don't reuse the
 * authenticated app shell (Sidebar/Header), and are reachable even while
 * logged out - Meta's App Review process requires working Privacy Policy /
 * Terms of Service URLs it can open without an account. */
const LegalPageLayout: React.FC<{ title: string; onBack: () => void; children: React.ReactNode }> = ({
  title,
  onBack,
  children,
}) => (
  <div className="bg-[#0B1120] text-[#F8FAFC] min-h-screen font-['Inter',system-ui,-apple-system,sans-serif] antialiased">
    <header className="sticky top-0 z-50 backdrop-blur-[10px] bg-[#0B1120]/80 border-b border-white/[0.08]">
      <div className="max-w-[860px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="flex items-center gap-2.5"
        >
          <Logo size={30} />
          <Wordmark className="text-[17px] font-extrabold text-[#F8FAFC] tracking-[-0.01em]" />
        </a>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="text-sm font-semibold text-[#CBD5E1] hover:text-white"
        >
          &larr; Back to home
        </a>
      </div>
    </header>

    <main className="max-w-[860px] mx-auto px-6 py-14">
      <h1 className="text-[32px] font-extrabold tracking-[-0.01em] mb-2">{title}</h1>
      <p className="text-sm text-[#64748B] mb-10">Effective {EFFECTIVE_DATE}</p>
      <div className="space-y-8 text-[15px] leading-7 text-[#CBD5E1] [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#60A5FA] [&_a]:underline">
        {children}
      </div>
    </main>

    <footer className="border-t border-white/[0.08] py-8 px-6">
      <p className="max-w-[860px] mx-auto text-xs text-[#475569]">© 2026 LumoraOS. All rights reserved.</p>
    </footer>
  </div>
);

export const PrivacyPolicyPage: React.FC<LegalPageProps> = ({ onBack }) => (
  <LegalPageLayout title="Privacy Policy" onBack={onBack}>
    <section>
      <p>
        This Privacy Policy explains how LumoraOS ("Lumora", "we", "us") collects, uses, and protects
        information when you use the Lumora Content OS platform at {SITE} (the "Service"), including
        when you connect third-party accounts such as Facebook, Instagram, YouTube, or LinkedIn to publish
        content.
      </p>
    </section>

    <section>
      <h2>1. Information we collect</h2>
      <p><strong>Account information.</strong> Name, email address, organization/workspace details, and
        authentication credentials when you sign up.</p>
      <p><strong>Content you create.</strong> Text, images, video, voice, and other assets you generate,
        upload, or schedule through the Service, along with the brand and campaign settings you configure.</p>
      <p><strong>Connected platform data.</strong> When you connect a social account (for example, via
        "Connect Facebook/Instagram", "Connect LinkedIn" or "Connect YouTube"), we receive and store only what is required to
        publish on your behalf:</p>
      <ul>
        <li>The Facebook Page ID and Page name you selected, and the Instagram Business Account ID and
          username linked to that Page (if any).</li>
        <li>A Page access token issued by Meta, scoped to the permissions you granted
          (<code>pages_show_list</code>, <code>pages_read_engagement</code>, <code>pages_manage_posts</code>,
          <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>business_management</code>).</li>
        <li>For LinkedIn: your LinkedIn member ID and name (from LinkedIn's sign-in, with the{' '}
          <code>openid</code> and <code>profile</code> permissions), and an access token that lets the Service
          post to your profile (<code>w_member_social</code>). LinkedIn issues these tokens for 60 days; we
          keep the expiry date so we can remind you to reconnect.</li>
        <li>For YouTube: your YouTube channel ID and channel name (read with the{' '}
          <code>youtube.readonly</code> permission, only to identify the channel and to check that the
          connection still works), and a Google refresh token that lets the Service upload the videos you
          choose to that channel (<code>youtube.upload</code>).</li>
        <li>Publishing status and metadata for posts you schedule or publish through the Service (for
          example, the resulting post ID and timestamp).</li>
      </ul>
      <p>We do not request or store your Facebook, Instagram, LinkedIn or Google password, and we do not read
        your personal feed, connections, direct messages, or content unrelated to the Pages, profile and
        channel you explicitly connect. From LinkedIn we read nothing beyond your member ID and name; from
        YouTube, nothing beyond your channel ID and name.</p>
      <p><strong>Usage data.</strong> Log data, device/browser information, and product analytics used to
        operate and improve the Service.</p>
    </section>

    <section>
      <h2>2. How we use information</h2>
      <ul>
        <li>To publish, schedule, and manage content on the Pages and accounts you connect, exactly as you
          direct within the Service.</li>
        <li>To operate, secure, and improve the Service, including AI-assisted content generation.</li>
        <li>To communicate with you about your account, billing, and Service updates.</li>
        <li>To comply with legal obligations and enforce our Terms of Service.</li>
      </ul>
      <p>We publish to a connected account only the text, image or video that you (or a member of your
        workspace) write or choose, at the time chosen in the Service ("Post now" or a scheduled time). We
        do not sell your data, and we do not use your connected Facebook, Instagram, LinkedIn or YouTube data
        for advertising or share it with data brokers.</p>
      <p>Lumora's use and transfer of information received from Google APIs adheres to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.</p>
    </section>

    <section>
      <h2>3. Third-party services</h2>
      <p>Publishing features rely on the official APIs of the platforms you connect (Meta Graph API for
        Facebook/Instagram, the LinkedIn API for LinkedIn, and the YouTube API Services for YouTube). Content you
        choose to publish
        is sent to those platforms and is then also governed by their own privacy policies; for YouTube that
        is the{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Google Privacy Policy
        </a>
        . We also use
        infrastructure and AI providers (such as hosting, storage, and generative AI/voice providers) to
        deliver the Service; those providers process data solely on our behalf under contractual
        confidentiality obligations.</p>
    </section>

    <section>
      <h2>4. Storage and security</h2>
      <p>Access tokens and other integration credentials are encrypted at rest. We use industry-standard
        safeguards (encryption in transit via HTTPS, access controls, and least-privilege scoping) to
        protect your data, and access tokens are used only for the publishing actions you initiate.</p>
    </section>

    <section>
      <h2>5. Data retention and deletion</h2>
      <p>We retain account and content data for as long as your account is active, or as needed to
        provide the Service. Connected-platform credentials (such as a Facebook Page access token or a
        LinkedIn access token, or a Google refresh token for YouTube) are retained only until you disconnect
        the integration or delete your account, whichever is sooner; a LinkedIn token also stops working when
        it expires and is replaced when you reconnect.</p>
      <p id="data-deletion"><strong>How to request deletion.</strong> You can disconnect a connected
        Facebook/Instagram Page, LinkedIn profile or YouTube channel at any time from the Integrations page, which
        immediately deletes the stored access token on our side. To delete your entire account and all associated
        data (including any stored integration credentials and generated content), email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account's registered email
        address with the subject "Data Deletion Request". We will confirm and complete deletion within 30
        days. You can also revoke Lumora's access directly at any time, independent of any action on our
        end: from your Facebook Settings → Business Integrations, on LinkedIn from Settings → Data
        privacy → Other applications → Permitted services, or for YouTube from your Google Account's{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
          third-party access page
        </a>
        .</p>
    </section>

    <section>
      <h2>6. Children's privacy</h2>
      <p>The Service is not directed to individuals under 16, and we do not knowingly collect personal
        information from them.</p>
    </section>

    <section>
      <h2>7. Changes to this policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be reflected by
        updating the effective date above.</p>
    </section>

    <section>
      <h2>8. Contact us</h2>
      <p>Questions about this policy or your data can be sent to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </section>
  </LegalPageLayout>
);

export const TermsOfServicePage: React.FC<LegalPageProps> = ({ onBack }) => (
  <LegalPageLayout title="Terms of Service" onBack={onBack}>
    <section>
      <p>
        These Terms of Service ("Terms") govern your access to and use of the Lumora Content OS platform
        at {SITE} (the "Service"), operated by LumoraOS ("Lumora", "we", "us"). By creating an account or
        using the Service, you agree to these Terms.
      </p>
    </section>

    <section>
      <h2>1. The Service</h2>
      <p>Lumora is an AI content operating system that helps you generate, manage, schedule, and publish
        content, including to third-party platforms you connect (such as Facebook Pages, Instagram
        Business accounts, YouTube, and LinkedIn).</p>
    </section>

    <section>
      <h2>2. Your account</h2>
      <p>You're responsible for the accuracy of your account information, for keeping your login
        credentials secure, and for all activity that happens under your account or workspace.</p>
    </section>

    <section>
      <h2>3. Connecting third-party platforms</h2>
      <p>When you connect a Facebook Page, Instagram Business account, or other platform, you authorize
        Lumora to publish content to that account only when you initiate or schedule a post through the
        Service. You must have the authority to manage the Page or account you connect, and you remain
        responsible for complying with that platform's own terms, community standards, and advertising
        policies (including Meta's Platform Terms and Community Standards, LinkedIn's User Agreement
        and Professional Community Policies, and YouTube's Terms of Service and Community Guidelines) for
        anything you publish. You may disconnect a connected
        account at any time from the Integrations page.</p>
      <p><strong>LinkedIn.</strong> Lumora posts to the personal LinkedIn profile of the member who connected
        it. A workspace has one LinkedIn connection, so posts created by any member of that workspace are
        published to that profile: connect only a profile you are happy for your workspace to post to.
        LinkedIn connections last 60 days and must then be reconnected.</p>
      <p><strong>YouTube.</strong> Lumora uploads to the YouTube channel connected to the workspace, using
        YouTube API Services. By connecting YouTube you agree to be bound by the{' '}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          YouTube Terms of Service
        </a>{' '}
        and the{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Google Privacy Policy
        </a>
        . Videos made with Lumora's AI are marked to YouTube as altered or synthetic content, and every upload
        is marked as not made for children. YouTube may keep videos private until it has reviewed Lumora's
        access.</p>
    </section>

    <section>
      <h2>4. Your content</h2>
      <p>You retain ownership of the content you create and publish through the Service. You grant Lumora
        a limited license to store, process, and transmit that content solely as needed to provide the
        Service (for example, to publish it to a platform you've connected). You're responsible for
        ensuring you have the necessary rights to any content, images, audio, or brand assets you upload
        or generate.</p>
    </section>

    <section>
      <h2>5. Acceptable use</h2>
      <p>You agree not to use the Service to publish unlawful, infringing, or fraudulent content, to
        circumvent a connected platform's policies, or to access the Service in a way that could disrupt
        or overload it.</p>
    </section>

    <section>
      <h2>6. Subscriptions and billing</h2>
      <p>Paid plans are paid in advance and run for 30 days. They do not renew automatically: to continue,
        you pay again from Billing. Each period starts with that plan's credits; unused credits do not carry
        over, and any remaining credits are removed when a plan ends without being renewed. You can view or
        change your plan from Billing at any time.</p>
    </section>

    <section>
      <h2>7. Termination</h2>
      <p>You may stop using the Service and delete your account at any time. We may suspend or terminate
        access for violations of these Terms or of a connected platform's policies discovered through use
        of the Service.</p>
    </section>

    <section>
      <h2>8. Disclaimers and liability</h2>
      <p>The Service is provided "as is." AI-generated content may be inaccurate and should be reviewed
        before publishing. To the extent permitted by law, Lumora is not liable for indirect or
        consequential damages arising from your use of the Service, including actions taken by
        third-party platforms on content you chose to publish.</p>
    </section>

    <section>
      <h2>9. Changes to these Terms</h2>
      <p>We may update these Terms from time to time; continued use of the Service after an update
        constitutes acceptance of the revised Terms.</p>
    </section>

    <section>
      <h2>10. Contact us</h2>
      <p>Questions about these Terms can be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </section>
  </LegalPageLayout>
);
