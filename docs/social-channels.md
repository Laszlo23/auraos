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

## LinkedIn

Env: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`  
(aliases: `LINKEDIN_APP_ID` / `LINKEDIN_APP_SECRET`)

Default scopes: `openid profile email` (Sign In with LinkedIn).  
Set `LINKEDIN_SHARE_SCOPE=1` after **Share on LinkedIn** (`w_member_social`) is approved.

## TikTok

Env: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

1. Create an app on [TikTok for Developers](https://developers.tiktok.com/).
2. Add **Login Kit** + **Content Posting API**.
3. Request scopes: `user.info.basic`, `video.upload`, `video.publish`.
4. Register the shared redirect URI above.
5. Until scopes are approved, Connect may work but publish will error with a clear message.

Publishing is **video-only**. From Channels, use a share-kit clip (same path as X native video). Aura prefers inbox upload (`video.upload`); falls back to Direct Post when available. Unaudited clients may only post privately (`SELF_ONLY`).

For `PULL_FROM_URL` later, verify `aibusiness.fun` (or your CDN prefix) under TikTok URL properties.

## Farcaster (Neynar)

Not OAuth — **managed signer**:

Env:

- `NEYNAR_API_KEY`
- `NEYNAR_FARCASTER_FID` — app FID that owns the signer requests
- `NEYNAR_CUSTODY_PRIVATE_KEY` — hex key for the custody address of that FID (used to EIP-712 sign key requests; Neynar can sponsor gas)

Flow:

1. Founder clicks Connect Farcaster.
2. Server creates a signer + registers a signed key (`sponsored_by_neynar: true`).
3. Popup opens Warpcast approval URL; founder slides to approve.
4. App polls until status is `approved`, then stores encrypted `signer_uuid` and FID.

Publish: Neynar `POST /v2/farcaster/cast` with the stored signer UUID (text casts).

Docs: [Neynar managed signers](https://docs.neynar.com/docs/integrate-managed-signers).

## Agents

| Provider | Agent |
|---|---|
| X, Meta, TikTok | Vela |
| LinkedIn, Farcaster | Orin |

## Week in review

Published posts from any connected provider roll into `/report` automatically. Share freezes a snapshot at `/w/$slug`.
