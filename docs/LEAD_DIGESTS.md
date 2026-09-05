# Lead digests (client inbox)

Twice daily emails of akquise leads to the founder’s real mailbox
(default **08:00 + 16:00 Europe/Vienna**).

## What ships

| Piece | Path |
| --- | --- |
| Prefs + send log | `lead_digest_prefs`, `lead_digest_sends` |
| Copy + schedule | `src/lib/lead-digest.ts` |
| Worker send | `src/lib/lead-digest.server.ts` → `/api/workers/tick` |
| UI | Lead hunter → **Inbox digests** |
| Platform mail | `PLATFORM_SMTP_*` in `.env` |

## VPS setup (required for delivery)

Digests leave Aura via **platform SMTP** (preferred) or the company’s connected SMTP.

```bash
# /opt/auraos/.env
PLATFORM_SMTP_HOST=smtp.example.com
PLATFORM_SMTP_PORT=465
PLATFORM_SMTP_SECURE=true
PLATFORM_SMTP_USER=…
PLATFORM_SMTP_PASS=…
PLATFORM_SMTP_FROM=leads@aibusiness.fun
PLATFORM_SMTP_FROM_NAME=Aura OS Leads
```

Worker cron must already hit `/api/workers/tick` with `WORKER_SECRET` (every ~10m).
Within the matching local hour, the tick sends once per slot (`YYYY-MM-DD-HH`).

## Sonja (enabled)

- Company: Sonja Immobilien  
- Email: `investment.sn@yahoo.com`  
- Hours: 8 + 16 Vienna · language DE  

After `PLATFORM_SMTP_*` is live, she can also tap **Send now** on `/akquise`.

## Founder controls

On `/akquise` → Inbox digests:

1. Toggle on  
2. Confirm delivery email  
3. Save  
4. Optional: Send now (force)
