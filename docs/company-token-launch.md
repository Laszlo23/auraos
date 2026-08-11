# Company Token Launch Desk

Seat-gated Clanker launches so each Aura company can mint its own Base ERC-20 + Uniswap V4 pool.

## Product boundary

| Layer | Meaning |
|-------|---------|
| Founding seat / Genesis | Membership / utility — not the company coin |
| In-app AURA | Compute ledger — not on-chain |
| Platform fair launch | Building Culture TGE (`TOKEN_LAUNCH_*`) |
| **Company token** | Clanker ERC-20 for **that** business only |

Not an investment product. Not auto-minted on signup. One live token per company.

## Flow

1. Founder has seat + smart wallet
2. **Draft** name / symbol / image / preset
3. **Ready** preview (Standard pool, DynamicBasic fees, vanity, reward split)
4. **Deploy** — confirm → `clanker-sdk` from wallet owner EOA; `tokenAdmin` + primary rewards = smart wallet; platform cut via `CLANKER_PLATFORM_FEE_BPS`

## Env

```
CLANKER_ENABLED=true
CLANKER_PLATFORM_FEE_BPS=500
```

Treasury for platform LP fee share: `X402_PAY_TO` or `OKX_PAYOUT_ADDRESS`.

## Code

| File | Role |
|------|------|
| `src/lib/company-token-presets.ts` | Presets that work |
| `src/lib/clanker.server.ts` | Deploy helper |
| `src/lib/company-token.functions.ts` | Draft / ready / deploy |
| `src/components/aura/company-token-launch.tsx` | Launch Desk UI |
| `supabase/migrations/20260811140000_company_token_launches.sql` | Schema |

## Out of v1

Auto-tokenize every company · replace compute AURA · Quant trading of company tokens · BSC · platform TGE automation.
