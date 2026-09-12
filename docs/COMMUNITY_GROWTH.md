# Community growth — trust first

How we get known on-chain and in communities **without** repeating Culture Coin trauma. Culture Coin was rugged by a former partner; Aura OS + TICKPIX rebuild with receipts.

## North star

1. **Verify, don’t believe** — CAs and mint URLs only on `aibusiness.fun` / `nft.aibusiness.fun`
2. **Ship in public** — `/changelog`, `/proof`, `/live`, GitHub
3. **Two keys, no dilution** — Hood = Base OS passport; Tickpix = RH culture seats
4. **Never by DM** — surprise CAs are always hostile

## Public surfaces (shipped)

| Surface | URL | Job |
| --- | --- | --- |
| Covenant | [/trust](https://aibusiness.fun/trust) | Six promises + verify strip |
| Pit | [/pit](https://aibusiness.fun/pit) | Tickpix discovery + trust strip |
| Mint | [nft.aibusiness.fun](https://nft.aibusiness.fun) | Canonical mint |
| Blog essay | [/blog/make-it-up-by-building](https://aibusiness.fun/blog/make-it-up-by-building) | Narrative for share |
| Share kit | [/share](https://aibusiness.fun/share) `#tickpix-pit` `#make-good` | Copy-ready captions |
| Proof | [/proof](https://aibusiness.fun/proof) | Work receipts |
| Roadmap | [/roadmap](https://aibusiness.fun/roadmap) | `tickpix-pit` stop |

Code: `src/lib/community-covenant.ts`, `src/routes/trust.tsx`, drip in `src/lib/x-launch-campaign.ts`.

## 48h T-0 announce (Sunday 13 Sep 2026, 11:11 Vienna)

Clock: [`src/lib/aura-t0-clock.ts`](../src/lib/aura-t0-clock.ts). Runbook: [`docs/AURA_T0_RUNBOOK.md`](./AURA_T0_RUNBOOK.md). **No CA in this post.**

### Pin on X `@bihary41418` (copy)

```
Fair launch T-0: Sunday 13 Sep 2026, 11:11 Europe/Vienna.
Token: AURA on Base. Official book: locked Uniswap v4 AURA/USDC. Seed $1,111 USDC. Starting book $6,000 USDC.
CA will be published at T-0 only on aibusiness.fun and @bihary41418 — never by DM.
Covenant: https://aibusiness.fun/trust
```

Worker also queues `t0-announce-2026-09-13` as due-now X + Farcaster (LinkedIn if Share is live).

## 48h distribution blast (paste-ready)

### Channels — re-seed drip checklist

1. Sign in as founder → **[Channels](https://aibusiness.fun/channels)**
2. Confirm **X** (and Farcaster if used) OAuth is connected — never store passwords
3. Start / refresh **Fair-launch X drip** (and FC sister drip). LinkedIn is 1 post/day (`li-drip-2026-09`) after Share on LinkedIn + reconnect
4. Confirm next slots include `make-good` + `tickpix-pit` (rotation leads with those)
5. Leave the worker ticking — do not manually spam the same CA in every reply

### Pin on X (copy)

```
Culture Coin was rugged by a former partner. We can’t rewrite that.

We make it up by building — rules you can hold us to:
https://aibusiness.fun/trust

TICKPIX culture seats (verify CA on Blockscout — never by DM):
https://aibusiness.fun/pit
Mint → https://nft.aibusiness.fun

CCFF00 = HoodStreet Proof of Neon (membership NFT):
https://hoodstreet.capital/ccff00

Readable RH hooks (not an airdrop):
https://hookr.fun/ · @hookrfun

Official only: aibusiness.fun · nft.aibusiness.fun · hoodstreet.capital · hookr.fun
```

Pin this. Reply with Blockscout token URL when someone asks for the CA.

### LinkedIn launch (paste now — API posting needs Share on LinkedIn)

Cadence once live: **one post / morning** (`li-drip-2026-09`), not the 3× X drip. Until `LINKEDIN_SHARE_SCOPE=1` + reconnect with `w_member_social`, paste this on Laszlo’s profile:

```
Most AI products sell you a chat window — then one scary price.

Aura OS is software for running a real company with AI employees.

You own it. They execute. You approve spend and outbound.

Three honest doors:
• Try Aura — free
• Monthly — $29
• Year — $299 (about two months free vs monthly)

Wien shops: Aura Local €49 / month.

The Hood NFT is a separate optional $299 mint. Not required to run the OS.

Start here: https://aibusiness.fun/pricing
```

### Discord / Telegram sticky (copy)

```
Aura OS · Building Culture continuity

How we show up (covenant): https://aibusiness.fun/trust
TICKPIX pit: https://aibusiness.fun/pit
Mint (canonical): https://nft.aibusiness.fun
CCFF00 / HoodStreet: https://hoodstreet.capital/ccff00
Hookr (RH Uniswap v4 hooks): https://hookr.fun/ · @hookrfun only

Hard rule: never trust a CA or mint link from a DM.
Official domains only: aibusiness.fun · nft.aibusiness.fun · hoodstreet.capital · hookr.fun

Demo the desk: https://aibusiness.fun/auth → /console
Share kit: https://aibusiness.fun/share
```

### Hasan / friends demo

Walk `/console` on Trustline Capital. Friends leave via founding invite or Scout `/lokal?ref=` — not via surprise CAs.

## Weekly ritual (founder / Channels)

1. **Seed / refresh X + Farcaster drip** on Channels (OAuth only — never store passwords). Rotation leads with `make-good` + `tickpix-pit`.
2. **Pin** one covenant post on X: link `/trust`, quote one promise, attach Blockscout for Tickpix CA.
3. **Discord / Telegram**: sticky message with mint URL + `/trust` + “never DM a CA.”
4. **Quest nudge**: community claim `tickpix:mint` / clock-in / share-tape; Scout invites for Local.
5. **Spaces / AMAs**: open with covenant, then product demo — not token price talk.
6. **Base + RH explorers**: reply to “is this a rug?” with `/trust` + explorer links, not arguments.

## Hard nos

- No second founding collection framing for Tickpix
- No Tickpix on `/sale` or pAURA rails
- No invented traction on quiet weeks
- No personal vendetta posts — principles + product only
- No force-push / history rewrite (Lovable-connected repo)

## On-chain presence checklist

- [x] Tickpix CA matches env + mint `config.js` (`0xa1F563AA…`)
- [x] Blockscout token page linked from `/pit` and `/trust`
- [x] Holders can link wallet → Pit badge in Aura
- [x] Hood mint / claim still Base-only narrative
- [x] `llms.txt` + sitemap list `/trust` `/pit`
- [ ] Founder re-seeds X/FC drip + pins covenant post (manual Channels)

## When someone asks about Culture Coin

Script (keep short):

> Culture Coin was rugged by a former partner. We can’t rewrite that. Aura OS ships software; TICKPIX is culture seats you can verify. Rules we publish at aibusiness.fun/trust — hold us to them.

Then link mint / pit / proof. Stop talking.
