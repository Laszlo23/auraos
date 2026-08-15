# Share kit & X fair-launch drip

Public clips people can steal, plus an OAuth-only X schedule that posts ~2–3×/day through fair launch.

**Hard rule:** never store an X username/password. Connect once via browser OAuth on **Channels**.

---

## Surfaces

| Surface | URL / path | Who |
|---|---|---|
| Share kit | [`/share`](https://aibusiness.fun/share) | Anyone (no login) |
| Watch page | `/v/{postId}` | Anyone — primary link in tweets |
| Embed | `/embed/{postId}` | iframes / partners |
| Channels drip | `/channels` → **Fair-launch X drip** | Founder (authenticated) |
| Landing teaser | `/#share-kit` | Anyone |
| Per-page OG cards | `/og/{home,wien,share,story,access,nachbar,review,token,lokal,team}.jpg` | Link previews — James Dean × Matrix × Wien |

Code map:

- Clip + caption data → [`src/lib/share-posts.ts`](../src/lib/share-posts.ts)
- X schedule bodies → [`src/lib/x-launch-campaign.ts`](../src/lib/x-launch-campaign.ts)
- Seed / status server fns → [`src/lib/social.functions.ts`](../src/lib/social.functions.ts) (`startLaunchDripCampaign`, `getLaunchDripStatus`)
- Publish + mention replies → [`src/lib/task-worker.server.ts`](../src/lib/task-worker.server.ts)
- UI → [`src/components/aura/share-kit.tsx`](../src/components/aura/share-kit.tsx), [`src/routes/_authenticated/channels.tsx`](../src/routes/_authenticated/channels.tsx)
- Media deploy → [`scripts/deploy-share-media.sh`](../scripts/deploy-share-media.sh)

---

## Share kit clips

Each entry in `SHARE_POSTS` needs:

1. MP4 at `public/{file}.mp4` (gitignored — deploy with the script)
2. Poster at `public/share/{file}.jpg`
3. Row in `SHARE_POSTS` (`id`, `file`, aspect, hooks, captions)
4. Filename listed in `KIT_MP4S` inside `deploy-share-media.sh`

### Current campaign clips (Aug 2026)

**Wien wave** (lead the kit + X drip). Tone: Wiener Schmäh, love, no judging, present-moment, gratitude. Growth loop: watch `/v/:id` → copy caption → share with a neighbor → next clip → `/wien`. Never pay-for-Google-review copy.

| id | file | angle |
|---|---|---|
| `wien` | `wien.mp4` | Ned in einem WeWork. In Wien. |
| `oida` | `oida.mp4` | Closing-shop thank-you + heart |
| `checkout` | `checkout.mp4` | €500 BAR vs stars — oida, ned des |
| `1fromweek` | `1fromweek.mp4` | Week 1. Share kit live. Grateful. |
| `4am` | `4am.mp4` | Founder awake; agents already shipped |
| `donotsleep` | `donotsleep.mp4` | Agents don’t sleep — you can |
| `hired` | `hired.mp4` | Just hired 8 AI employees |
| `makemoney` | `makemoney.mp4` | Own a company, let AI make money |
| `makemoney2` | `makemoney2.mp4` | Punchier CTA cut |
| (+ kit classics) | `meanwhile`, `aprove`, `wait`, … | Rotated into the drip after the five |

Generate a poster:

```bash
ffmpeg -y -ss 4 -i public/FILE.mp4 -frames:v 1 -q:v 4 public/share/FILE.jpg
```

Deploy media to the VPS:

```bash
bash scripts/deploy-share-media.sh
# optional: DEPLOY_HOST=root@… DEPLOY_SSH_KEY=… bash scripts/deploy-share-media.sh
```

---

## How the X drip works

```
Connect X (OAuth)
    → Start fair-launch drip
        → inserts channel_posts (status=scheduled, campaign_key=launch-drip-2026-08#N)
            → worker tick every 5–15 min
                → publishDueChannelPosts (only if Autopublish ON + X connected)
                    → POST api.twitter.com/2/tweets (text + /v/{id} link)
                → syncSocialEngagement (mentions; reply_mode auto|draft|off)
```

- Cadence: slots at **09:14 / 13:14 / 18:14 CEST**, quiet before 07:00.
- Ends at `TOKEN_LAUNCH_AT` (`17 Aug 2026 · 13:11 CEST`) from [`src/lib/site.ts`](../src/lib/site.ts).
- Bodies are ≤280 chars: short line + `https://aibusiness.fun/v/{postId}`.
- Worker attaches the native MP4 when the X token includes `media.write` (reconnect Channels → X after scope add).
- Humans can still download MP4s from `/share`.
- Public company receipts: `/company/{slug}` (activity, roster, posts).
- Re-seeding is idempotent via unique `(company_id, campaign_key)`.

Migration required once:

```text
supabase/migrations/20260808190000_channel_posts_campaign_key.sql
```

Apply with Supabase MCP `apply_migration`, SQL editor, or `supabase db push` after link.

---

## Go-live checklist

### 1. Env (local + `/opt/auraos/.env`)

| Variable | Purpose |
|---|---|
| `X_CLIENT_ID` | X OAuth 2 app client id |
| `X_CLIENT_SECRET` | X OAuth 2 app secret |
| `OAUTH_REDIRECT_BASE` | `https://aibusiness.fun` (or local origin) |
| `APP_USER_CONNECTION_KEY_SECRET` | Encrypts tokens in `channel_connections` |
| `WORKER_SECRET` | Bearer auth for `/api/workers/tick` |

X Developer App scopes: `tweet.read tweet.write users.read offline.access`.

Callback URL must match: `{OAUTH_REDIRECT_BASE}/api/oauth/social/callback`.

### 2. Database

`campaign_key` on `channel_posts` is required for idempotent drip seeding
(`20260808190000_channel_posts_campaign_key.sql`). Applied on prod as of 2026-08-09.

### 3. Worker cron (required)

Every 5–15 minutes on the VPS (or any scheduler that can hit prod):

```bash
# Example crontab — replace SECRET from /opt/auraos/.env WORKER_SECRET
*/10 * * * * curl -sS -H "Authorization: Bearer SECRET" \
  https://aibusiness.fun/api/workers/tick >/dev/null
```

Without this, scheduled posts never leave the queue. Founder Approve only runs a
**tenant-scoped** tick — it cannot publish other companies’ drip.

### 4. X OAuth scopes

Reconnect X if `media.write` is missing — video drip uploads fail without it.

### 5. Media

```bash
bash scripts/deploy-share-media.sh
```

Confirm `https://aibusiness.fun/4am.mp4` (and posters under `/share/`) return 200.

### 6. Founder actions in the app

1. Sign in → **Channels**
2. **Connect X** (popup OAuth — no password)
3. Leave **Autopublish on** (drip start turns it on; toggling off pauses publishes)
4. Set comment replies to **auto** (mentions) or **draft** (approve in inbox)
5. Click **Start fair-launch drip**
6. Confirm upcoming rows in the drip panel

Optional standing voice: knowledge item titled **Channel standing instruction**.

---

## Autopublish vs reply mode

| Control | Effect |
|---|---|
| **Autopublish on** | Worker may publish due `scheduled` posts |
| **Autopublish off** | Due posts stay scheduled (drip paused) |
| **Reply auto** | Mention replies send without approval |
| **Reply draft** | Mentions land in Channels inbox for approve |
| **Reply off** | Mentions ignored |

Manual **Publish now** on Channels still posts immediately (does not require Autopublish).

---

## Adding a new clip to the drip

1. Drop `public/newclip.mp4` + `public/share/newclip.jpg`
2. Add `SHARE_POSTS` entry + `KIT_MP4S` name
3. Add short lines to `X_LINES` and id to `ROTATION_IDS` in `x-launch-campaign.ts`
4. Deploy media; rebuild/restart app if needed
5. On Channels, **Re-sync drip schedule** (only inserts missing `campaign_key`s — change keys or clear old rows if you need a full rewrite)

---

## Troubleshooting

| Symptom | Check |
|---|---|
| “Connect X first” | OAuth not connected, or env missing `X_CLIENT_*` |
| “X is not configured” | `X_CLIENT_ID` / `X_CLIENT_SECRET` empty on the server process |
| Posts stuck as `scheduled` | Autopublish off, or cron not hitting tick with `WORKER_SECRET` |
| Status `failed` | Row `error` column — often expired token → Reconnect X |
| Duplicate seed does nothing new | Expected — same `campaign_key`s already present |
| Watch link 404 video | MP4 not on VPS — rerun `deploy-share-media.sh` |
| Mentions never answered | `reply_mode` off, or autonomy `0` forces draft |

Worker auth: Channels’ unauthenticated `fetch("/api/workers/tick")` will 401 without Bearer. Prefer cron with `WORKER_SECRET`, or the authenticated `triggerWorkerTick` path.

---

## Related

- Supabase / production env overview → [`docs/supabase.md`](./supabase.md)
- Fair launch clock → `TOKEN_LAUNCH_*` in [`src/lib/site.ts`](../src/lib/site.ts)
- Whitelist “share the announce post” on `/access` is separate from this kit
