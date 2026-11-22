# Meta App Review: letting every customer connect their Facebook Page

Until Meta approves the app, only people with a role on it (admins, developers, testers) can connect Facebook. This is
what to fill in so the review passes. The texts in quotes are ready to paste.

Meta app: **Lumora** (App ID 983364921419989), business portfolio **Aradhya Enterprises**. The business verification
uses the GST certificate; its legal name is the proprietor's (Rajni Mehra), and lumoraos.in's Privacy Policy and Terms
name both, with the registered address.

## 1. Before the review

- **Business verification** done (Settings → Security Center).
- **App settings → Basic**
  - Display name: `Lumora`
  - App icon: <https://lumoraos.in/lumora-logo.png> (1024×1024)
  - Category: **Business and pages**
  - App domains: `lumoraos.in`
  - Privacy policy URL: `https://lumoraos.in/privacy`
  - Terms of service URL: `https://lumoraos.in/terms`
  - User data deletion → Data deletion instructions URL: `https://lumoraos.in/privacy#data-deletion`
- **Facebook Login → Settings → Valid OAuth Redirect URIs** includes
  `https://lumoraos.in/api/v1/integrations/meta/callback` (the server's `META_REDIRECT_URI`).
- **A reviewer account on Lumora**: Admin → New account, Pro for 1 month, "Set a password for them now". Then sign in
  as it once and put one short video in its Gallery (make one in Video Studio, or Video Studio → **Upload** an MP4 and
  save it to the Gallery), because posting to a Facebook Page here takes a video. Put the email and password only in Meta's form, never in this repository.

## 2. Permissions to request (App Review → Permissions and Features → Request advanced access)

The login asks for exactly these (`FACEBOOK_PAGE_SCOPES` in
`apps/api/src/modules/integrations/infrastructure/meta-graph-api.client.ts`). Instagram is not asked for until the
website can post to Instagram (see section 6).

**pages_show_list**
> "When a Lumora user presses Connect Facebook (Integrations page), we list the Facebook Pages they manage so the
> Page they want to publish to is connected to their Lumora workspace. We store only that Page's ID and name."

**pages_read_engagement**
> "Meta requires pages_read_engagement together with pages_manage_posts. Lumora uses it only for the connected Page's
> name and the ID of the post it has just published, so the user's Facebook Posts page can show the post as published
> with a View on Facebook link. We do not read the Page's followers, comments or insights."

**pages_manage_posts**
> "Lumora users create short marketing videos (for example insurance advisors in India) and choose to post them, now
> or at a time they schedule, to the Facebook Page they connected. pages_manage_posts is used only to publish the
> video and caption the user wrote, to that Page, at the time they chose. We never post without the user's action."

**business_management**
> "Many of our users' Pages are owned by a Meta business portfolio. business_management lets the connect step list
> and use those Pages, so users whose Page belongs to a business portfolio can connect it too."

## 3. Instructions for the reviewer (paste into each request)

> 1. Go to https://lumoraos.in/login and sign in with the test account below.
> 2. In the left menu open **Integrations**, then press **Connect Facebook**.
> 3. In Facebook's window, sign in with your test user, choose a Facebook Page you manage and allow the permissions.
>    You return to Lumora and the card says **Connected** with the Page name.
> 4. In the left menu, under Published, open **Facebook Posts** and press **New post**.
> 5. Pick the video already in the Gallery, write a caption (or press Write with AI), choose **Post now** and send.
> 6. The post appears under Published within a minute, with a link to it on the Facebook Page.
>
> Test account: [email] / [password]. The account is pre-loaded with a short video so posting can be tested at once.

## 4. Screen recording (one video, used for every permission)

Record the browser, about 2 minutes, no sound needed:

1. lumoraos.in sign-in, then the dashboard.
2. Integrations → **Connect Facebook** → Facebook's login and permission screen (show the permissions list) → choose
   the Page → back in Lumora, **Connected** with the Page name.
3. Facebook Posts → **New post** → pick a video → caption → **Post now**.
4. The post under Published with **View on Facebook** → click it → the post on the Facebook Page.
5. Integrations → **Disconnect** (shows the user can remove the connection at any time).

## 5. Data handling questions

- **What Facebook data do you store?** The connected Page's ID and name and a Page access token. The token is
  encrypted before it is stored (`EncryptionService`) and is used only to publish posts the user asks for.
- **Do you share or sell it?** No. It is not shared with third parties or used for ads or analytics.
- **Where is it processed?** On Lumora's own server (lumoraos.in).
- **How is it deleted?** Disconnect in Integrations wipes the token at once. A user can also ask for deletion by email
  as described at https://lumoraos.in/privacy#data-deletion; it is done within 30 days.
- **Responsible business:** Aradhya Enterprises (proprietor: Rajni Mehra), Amritsar, Punjab, India.

## 6. After approval

- Switch **App Mode** from Development to **Live**. Every customer can then connect their own Page in Integrations.
- **Instagram later:** when the website can post to Instagram, set the GitHub variable `META_INSTAGRAM_ENABLED=true`
  (the login then also asks for `instagram_basic` and `instagram_content_publish`), redeploy, and submit those two
  permissions with their own recording. Customers already connected reconnect once to add Instagram.
- **Until then, early customers:** App roles → Roles → Add People → Tester, and they accept the invite.
