# Social channels setup

Aura OS connects founder accounts for publishing via one popup flow on **Connect** / **Channels**.

Shared OAuth callback (X, Meta, LinkedIn, TikTok):

```
{OAUTH_REDIRECT_BASE}/api/oauth/social/callback
```

Examples:

- Production: `https://aibusiness.fun/api/oauth/social/callback`
- Local: `http://localhost:4000/api/oauth/social/callback`

Also set `APP_USER_CONNECTION_KEY_SECRET` (encrypts tokens at rest).

## X

Scopes: `tweet.read tweet.write users.read offline.access like.read media.write`

Env: `X_CLIENT_ID`, `X_CLIENT_SECRET`

Video drip needs `media.write` — reconnect if older tokens lack it.

## Meta (Facebook + Instagram)

Env: `META_APP_ID`, `META_APP_SECRET`

Needs a Facebook Page (and optional IG Business account linked to that Page).

App products / permissions:

- Pages: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`
- Instagram: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`
- Optional: set `META_BUSINESS_SCOPE=1` for `business_management` (usually needs App Review)
- Switch the Meta app to **Live** (or add users as Testers) — Development mode only works for admins/testers
- Valid OAuth redirect: `{OAUTH_REDIRECT_BASE}/api/oauth/social/callback`

**Publish behavior**

- With IG linked + share-kit clip (or public HTTPS `mediaUrl`): Instagram Reels / IMAGE via Content Publishing API, then mirrors caption to the Facebook Page when possible.
- Text-only (no media): Facebook Page feed post.
- Tokens: Page access token is stored for posting; long-lived **user** token is kept as refresh so Aura can re-mint Page tokens. **Reconnect Meta once** after deploy so refresh is stored on older connections.

Register redirect: `{OAUTH_REDIRECT_BASE}/api/oauth/social/callback`

Share-kit MP4/JPG must be publicly reachable over HTTPS (e.g. `https://aibusiness.fun/...`) for IG to pull them.

## LinkedIn

Env: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`  
(aliases: `LINKEDIN_APP_ID` / `LINKEDIN_APP_SECRET`)

Default scopes: `openid profile email` (Sign In with LinkedIn).  
Set `LINKEDIN_SHARE_SCOPE=1` after **Share on LinkedIn** (`w_member_social`) is approved, then **reconnect** LinkedIn in Channels.

Comment APIs need separate LinkedIn products — reply automation stays draft/off until approved.

Once share is live, the worker seeds **one post / CEST morning** (`li-drip-2026-09`) when Autopublish is on. Do not clone the 3×/day X cadence. The 48h T-0 announce (`t0-announce-2026-09-13`) is a separate due-now post on X + Farcaster (LinkedIn if Share is live). No CA in that post.

T-0: Sunday 13 Sep 2026, 11:11 Europe/Vienna. Runbook: `docs/AURA_T0_RUNBOOK.md`.

## TikTok

Env: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

1. Create an app on [TikTok for Developers](https://developers.tiktok.com/).
2. Add **Login Kit** + **Content Posting API**.
3. Request scopes: `user.info.basic`, `video.upload`, `video.publish`.
4. Register the shared redirect URI above.
5. Drop keys into VPS `.env` and restart the app (or redeploy).
6. Until scopes are approved, Connect may work but publish will error with a clear message.
7. Redirect URI must match exactly (prod + local if you test locally).

Publishing is **video-only**. From Channels:

- Compose → pick a share-kit clip (required for TikTok), or
- **Post share-kit clip** panel → choose TikTok

Aura prefers inbox upload (`video.upload`); falls back to Direct Post when available. Unaudited clients may only post privately (`SELF_ONLY`).

For `PULL_FROM_URL` later, verify `aibusiness.fun` (or your CDN prefix) under TikTok URL properties.

## Farcaster (Neynar)

**Official channel:** [farcaster.xyz/~/channel/auraos](https://farcaster.xyz/~/channel/auraos) (`/auraos`).

Not classic OAuth — **Neynar signer**:

Env (preferred — agent / bot):

- `NEYNAR_API_KEY`
- `NEYNAR_AGENT_ID` (or `NEYNAR_SIGNER_UUID`) — already-approved signer with write perms
- `NEYNAR_UID` or `NEYNAR_FARCASTER_FID` — FID for mentions / identity (optional for cast)

Flow (agent):

1. Founder clicks Connect Farcaster.
2. Server attaches the env agent signer to the company (no Warpcast popup).
3. Publish uses Neynar `POST /v2/farcaster/cast` with that `signer_uuid`.

Fallback (managed signer + Warpcast approve):

- `NEYNAR_FARCASTER_FID` / `NEYNAR_UID` + `NEYNAR_CUSTODY_PRIVATE_KEY`
- Server creates a signer, registers a signed key (`sponsored_by_neynar: true`), popup for Warpcast approval, then poll until `approved`.

Docs: [Neynar managed signers](https://docs.neynar.com/docs/integrate-managed-signers).

## Agents

| Provider            | Agent |
| ------------------- | ----- |
| X, Meta, TikTok     | Vela  |
| LinkedIn, Farcaster | Orin  |

## Week in review

Published posts from any connected provider roll into `/report` automatically. Share freezes a snapshot at `/w/$slug`.
