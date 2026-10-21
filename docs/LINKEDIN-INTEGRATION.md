# LinkedIn integration

Lumora posts to a **personal LinkedIn profile**: text on its own, or text with one image or one video from the Gallery,
either straight away or at a time you pick. Scheduled and published posts appear in the Calendar.

Contents:

1. [Set it up (once, by the account owner)](#1-set-it-up-once-by-the-account-owner)
2. [Connect a profile](#2-connect-a-profile)
3. [Post](#3-post)
4. [The 60-day connection](#4-the-60-day-connection)
5. [How it works (for developers)](#5-how-it-works-for-developers)
6. [Troubleshooting](#6-troubleshooting)
7. [Limits and next steps](#7-limits-and-next-steps)

---

## 1. Set it up (once, by the account owner)

Lumora needs its own LinkedIn developer app. Nothing about LinkedIn works on a server until this is done: pressing
**Connect LinkedIn** in Integrations says "LinkedIn publishing is not configured".

### 1.0 What the app needs from the website (already there)

- **Privacy policy:** <https://lumoraos.in/privacy> covers LinkedIn: what is stored (member ID, name, a 60-day posting
  token), what is posted and when, and how to disconnect or revoke access. Disconnecting deletes the stored token.
- **Terms:** <https://lumoraos.in/terms> says posts go to the connecting member's profile, one per workspace.
- **Logo:** download <https://lumoraos.in/lumora-logo.png> (1024×1024) for the app and the Company Page.

### 1.1 Create a LinkedIn Company Page (skip if you have one)

LinkedIn only lets a Company Page own a developer app. Create one at <https://www.linkedin.com/company/setup/new>
(**Company**), signed in as yourself:

| Field | Suggested value |
| --- | --- |
| Name | LumoraOS |
| LinkedIn public URL | `linkedin.com/company/lumoraos` (take the next free one if it is taken) |
| Website | `https://lumoraos.in` |
| Industry | Software Development |
| Organization size | 0-1 employees (or your real size) |
| Organization type | Privately held (or your real type) |
| Logo | <https://lumoraos.in/lumora-logo.png> |
| Tagline | Images, videos and voiceovers for your business, then scheduled and published from one place |

You become the page's admin, which also lets you approve the app in 1.2 step 4.

### 1.2 Create the LinkedIn app

1. Sign in to LinkedIn as usual, then open <https://www.linkedin.com/developers/apps/new> (**Create app**; your apps are
   listed later at <https://www.linkedin.com/developers/apps>). There is no `/developers/login` page: that address shows
   "The page you are looking for could not be found".
2. Fill in:
   - **App name:** `Lumora`
   - **LinkedIn Page:** your business's LinkedIn Company Page. LinkedIn will not create an app without one; create a
     page first if you have none. The app is only associated with the page; posts still go to personal profiles.
   - **Privacy policy URL:** `https://lumoraos.in/privacy`
   - **App logo:** <https://lumoraos.in/lumora-logo.png> (download it, then upload it here).
3. Accept the legal agreement and create the app.
4. On the app's **Settings** tab, choose **Verify** and send the link to an admin of the Company Page (or open it
   yourself if you are one). The app works only after the page admin approves it.

### 1.3 Add the two products

On the **Products** tab, request both. They are self-serve and approved straight away:

| Product | Gives Lumora |
| --- | --- |
| **Sign In with LinkedIn using OpenID Connect** | `openid`, `profile`: who connected, and their name for the preview |
| **Share on LinkedIn** | `w_member_social`: post as that person |

Do not request the Community Management API here: it is only needed for Company Page posting (see
[section 7](#7-limits-and-next-steps)) and LinkedIn will not combine it with other products on one app.

### 1.4 Add the redirect address

On the **Auth** tab, under **Authorized redirect URLs for your app**, add:

```
https://lumoraos.in/api/v1/integrations/linkedin/callback
```

For local development also add `http://localhost:3000/api/v1/integrations/linkedin/callback`.

The same tab shows the **Client ID** and the **Primary Client Secret** you need next.

### 1.5 Give the keys to the server

In GitHub: **Settings → Secrets and variables → Actions**. Never paste the secret into chat, email or a ticket.

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `LINKEDIN_CLIENT_SECRET` | The Primary Client Secret |
| Variable | `LINKEDIN_CLIENT_ID` | The Client ID |
| Variable | `LINKEDIN_REDIRECT_URI` | `https://lumoraos.in/api/v1/integrations/linkedin/callback` |
| Variable (optional) | `LINKEDIN_API_VERSION` | Leave unset. See [API version](#api-version). |

The next deploy (any push to `main`, or re-running the "Deploy (Docker)" workflow) copies them to the server.
Check the deploy log's ops-check lines:

```
[ops-check] linkedin keys set: client id true, secret true
[ops-check] linkedin redirect: https://lumoraos.in/api/v1/integrations/linkedin/callback
[ops-check] linkedin api version: automatic (three months back)
```

`FRONTEND_URL` on the server must be `https://lumoraos.in`: after LinkedIn approves the connection, Lumora sends the
browser back there.

### 1.6 Local development

Put the same three values in `apps/api/.env.development`, with the localhost redirect address from 1.4, then restart
the API (`deploy/local/dev.ps1`). `FRONTEND_URL` there should be the web address you use locally
(`http://localhost:3100` in dev mode).

---

## 2. Connect a profile

1. Open **Integrations** and press **Connect LinkedIn** in the "LinkedIn & YouTube" box.
2. Sign in to LinkedIn and allow Lumora to post on your behalf.
3. You return to Integrations, which now shows **Connected**, the profile's name and **Reconnect by** with a date.

**One connection per workspace.** Whoever connects LinkedIn, every post made from that workspace goes to *their*
profile, including posts written by teammates. Connect with the profile that should carry the posts. Pressing
**Reconnect LinkedIn** with a different account switches the workspace to that profile; **Disconnect** removes it,
and scheduled LinkedIn posts then fail until someone connects again.

---

## 3. Post

### Where to start

| From | What opens |
| --- | --- |
| **LinkedIn Posts** (sidebar, under Creation) → **New post** | An empty post; the page also lists your scheduled, published and failed LinkedIn posts |
| **Calendar → New post** | An empty post |
| **Gallery → Post** (on an image or video card, or in its preview) | A post with that item attached |
| **Image Studio**, after **Save to gallery** → **Post** | A post with that image attached |
| **Video Studio**, finished video → **Post or schedule** | A post with the video (saved to the Gallery first if it was not yet) |
| **Create** menu (header, or the bottom bar on a phone-width screen) → **LinkedIn post** | An empty post |
| **Ctrl+K** → "Create a LinkedIn post" | An empty post |
| Phone app: **Gallery** → an image or video → **Post or schedule** | The phone's post sheet |

### Writing the post

- **Post to:** your connected LinkedIn profile; it is the only account offered (Facebook, Instagram and YouTube can
  take only videos from Lumora, so they are left out of the post window). If LinkedIn is not connected, or the
  connection ran out, the window shows **Connect LinkedIn** / **Reconnect** right there. LinkedIn takes text only, an
  image or a video.
- **Text:** up to 3,000 characters on LinkedIn (the counter turns red past the limit). Put hashtags at the end, e.g.
  `#TermInsurance`; they stay clickable on LinkedIn, Hindi and Punjabi hashtags included.
- **Speak** types what you say. **Write with AI** drafts a post from what you made (the image's or video's prompt) or
  from a few words you typed; **Improve with AI** rewrites your draft. Both are free. AI text is a draft: check facts,
  figures and any insurance claims before posting; the writer is told not to invent numbers or guarantees and leaves
  placeholders such as `[premium]` instead.
- **Image or video:** optional; pick one from your Gallery.
- **Preview:** roughly how it will look on LinkedIn, which shows the first few lines and a "...more" link.
- **When:** **Post now**, or **Schedule** and pick a time at least a minute ahead (the website suggests tomorrow 9:00,
  the phone app the next full hour).

### After posting

- **Post now:** it appears on the profile within a minute or two (longer for a video, which LinkedIn processes first).
- **Scheduled:** it sits in the **Calendar**, where you can change its text or time, or cancel it, until it goes out.
- Either way you get a notification: "Posted to LinkedIn", or "LinkedIn post failed" with LinkedIn's own reason (see
  [Troubleshooting](#6-troubleshooting)). The phone app's Calendar links to each published post.

---

## 4. The 60-day connection

LinkedIn connections last **60 days** and cannot renew themselves for apps like Lumora's. So that posts never fail
silently:

- **Integrations** shows "Reconnect by &lt;date&gt;", in amber during the last week, and **Expired** afterwards.
- **The post window** warns during the last week, and refuses a scheduled time after the connection runs out.
- **Notifications** go to the person who connected LinkedIn a week before, the day before, and on the day it runs out
  (sent around 9:00 India time).
- **To renew,** open Integrations and press **Reconnect LinkedIn**. That gives another 60 days. Posts already scheduled keep
  their times and use the new connection.

---

## 5. How it works (for developers)

### Flow

```
Post window (website or phone)
  └─ POST /api/v1/publishing/posts          { text, mediaAssetId?, platforms[], scheduledAt? }
       └─ SocialPostsService                 checks every account, then saves
            ├─ Content                       title, text, metadata.caption / imageUrl / videoUrl
            └─ PublishingJob per account     scheduledAt = the chosen time, or now
                 └─ "publishing.created" event → SocialPublishEventsListener
                      └─ BullMQ "social-publish" queue, delayed until scheduledAt
                           └─ SocialPublishProcessor        loads content + the workspace's credentials
                                └─ LinkedInPublisherProvider
                                     ├─ Images API  (initializeUpload → PUT bytes)
                                     ├─ Videos API  (initializeUpload → PUT parts → finalizeUpload → wait for AVAILABLE)
                                     └─ Posts API   (POST /rest/posts) → job "published" + permalink
```

The API checks everything again, whatever the client sent: which media each account takes, text length, that the
account is connected and that a LinkedIn connection is still valid at the post time. Media is accepted only as the id
of a Gallery item in the poster's own workspace, never as a web address.

### Files

| Area | File |
| --- | --- |
| Post window (website) | `src/components/PostComposer.tsx`, opened with `openPostComposer()` from `src/lib/socialPosts.ts` |
| Post sheet (phone) | `apps/mobile/src/ui/PostSheet.tsx`, `apps/mobile/src/lib/api-social.ts` |
| Endpoint and checks | `apps/api/src/modules/publishing/presentation/social-posts.controller.ts`, `application/services/social-posts.service.ts` |
| What each account takes | `apps/api/src/modules/publishing/domain/post-media.ts` (mirrored in `src/lib/socialPosts.ts` and `apps/mobile/src/lib/api-social.ts`; change all three together) |
| Posting to LinkedIn | `apps/api/src/modules/publishing/infrastructure/providers/linkedin-publisher.provider.ts` |
| Text escaping | `.../providers/linkedin-commentary.ts` |
| Connecting (OAuth) | `apps/api/src/modules/integrations/infrastructure/linkedin-api.client.ts`, `application/services/linkedin-connect.service.ts`, `presentation/linkedin-connect.controller.ts` |
| Worker | `apps/api/src/queues/processors/social-publish.processor.ts` |
| Expiry reminders | `apps/api/src/queues/connection-expiry-reminder.service.ts`, `social-publish.scheduler.ts` |
| Configuration | `apps/api/src/config/linkedin.config.ts`, `env.validation.ts` |

### Connection and credentials

`GET /api/v1/integrations/linkedin/connect` returns LinkedIn's sign-in address with an encrypted, 10-minute `state`.
LinkedIn sends the browser to `/integrations/linkedin/callback`, which exchanges the code for a token, reads the member
id and name (`/v2/userinfo`) and saves `{ authorUrn, memberName, accessToken, expiresAt }` AES-256-GCM-encrypted in the
`integrations` table (one row per workspace and provider). Tokens never reach the browser. The connection status
(`GET /integrations/meta/status`, shared by all platforms) adds `expiresAt` and `expired` for LinkedIn.

### Post text

LinkedIn reads post text in its "little text" format, where `\ | { } @ [ ] ( ) < > # * _ ~` are markup. Unescaped, a
bracket or an `@` can cut a post short or make LinkedIn refuse it, so `toLinkedInCommentary()` escapes them and turns
hashtags (`#word` after a space or at the start, any script) into LinkedIn's hashtag template so they stay clickable.

### API version

LinkedIn's REST API is versioned by month (`LinkedIn-Version: YYYYMM`), and each version is retired about a year after
release. Unless `LINKEDIN_API_VERSION` pins one, Lumora uses the month three months back: always released, and well
inside its year. Pin a version only to work around a specific LinkedIn change; remove the pin afterwards, or posting
breaks when that version is retired.

### Tests

```
cd apps/api
npx jest src/modules/publishing src/queues/connection-expiry-reminder.service.spec.ts
```

These cover the request LinkedIn receives for text, image and video posts (including the video upload in parts),
the text escaping, the version choice, every rule of the post endpoint, and the reminder dates. They run with mocked
LinkedIn responses.

End to end, without LinkedIn credentials, a fake connection row in the **local** database makes the whole flow run:
the post window, the endpoint, the queue and the worker. LinkedIn then refuses the post with "Invalid access token",
which shows on the failed post and in its notification. That proves everything up to LinkedIn's sign-in check. A
real post needs a real connection (section 2).

---

## 6. Troubleshooting

| Message | Cause | What to do |
| --- | --- | --- |
| "LinkedIn publishing is not configured - set LINKEDIN_CLIENT_ID/..." | The server has no LinkedIn keys | Section 1.5; check the ops-check lines in the deploy log |
| The same, although all three names are in GitHub | `LINKEDIN_CLIENT_SECRET` was saved under **Variables** (the deploy reads it only from **Secrets**), or it was saved after the deploy job had started (a job gets the secrets it starts with) | Move it to Secrets (generate a new one on LinkedIn if it sat in Variables), delete the variable, then deploy again |
| LinkedIn's page says the redirect address does not match | The address in `LINKEDIN_REDIRECT_URI` is not listed on the app's Auth tab | Make both exactly `https://lumoraos.in/api/v1/integrations/linkedin/callback` |
| "Invalid OAuth state" / "OAuth state expired - please reconnect" | The sign-in took longer than 10 minutes, or the page was reused | Press Connect LinkedIn again |
| "Connect LinkedIn in Integrations first." | No LinkedIn connection in this workspace | Section 2 |
| "Your LinkedIn connection expired on ..." / "runs out on ..., before this post's time" | The 60 days are over, or will be by the scheduled time | Reconnect LinkedIn (section 4) |
| "LinkedIn post failed: ... Invalid access token" | The connection was revoked on LinkedIn, or has expired | Reconnect LinkedIn |
| "LinkedIn did not accept the post: ... duplicate ..." | The same text was posted to that profile recently | Change the text |
| Any LinkedIn message ending "Requested version ... is not active" | `LINKEDIN_API_VERSION` pins a retired version | Remove the variable and redeploy |
| "LinkedIn could not process this video" | LinkedIn rejected the file | Use an MP4 of a few minutes or less |
| "LinkedIn is still processing the video" | Processing took longer than 5 minutes | Post it again in a few minutes |
| "Could not read the file to post (404)" | The Gallery file is gone, or the server cannot reach its own address | Check the file opens in the Gallery; check `APP_URL` (see `deploy/README.md`) |
| "Facebook needs a video ..." / "Instagram can only post a video from Lumora for now." | That account does not take text-only or image posts yet | Post the text or image to LinkedIn, or attach a video |
| "LinkedIn takes up to 3,000 characters; this post has ..." | The text is too long | Shorten it |

A failed post stays in the Calendar under **Failed**. Fix the cause, then create the post again.

---

## 7. Limits and next steps

- **Personal profiles only.** Posting as a Company Page needs LinkedIn's **Community Management API**. That takes a
  separate LinkedIn app (it cannot share an app with the products above), a review by LinkedIn and a registered
  business, and Lumora would also need a page picker when connecting.
- **One profile per workspace** (section 2).
- **No post statistics** (likes, comments, views). LinkedIn offers them only to apps it has approved for that.
- **One image or one video per post.** Multi-image posts and PDF "carousel" posts are possible later.
- **Facebook and Instagram image posts** are the next step for the same post window.
