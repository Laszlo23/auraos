# FIO Protocol — Aura's primary crypto-handle rail

Aura keeps **in-app `@handles`** for leaderboards, public profiles, and social identity.
**FIO handles** (`name@domain`) are the main **crypto receive identity** — human-readable,
cross-wallet, chain-mapped. That split is intentional: FIO is censorship-resistant and
portable; Aura `@` is product UX.

## What works today

| Capability                                                       | Status                                        |
| ---------------------------------------------------------------- | --------------------------------------------- |
| Resolve FIO → public address (`avail_check` + `get_pub_address`) | Live — multi-endpoint failover                |
| Attest FIO to signature-verified wallet (must match mapping)     | Live — `/identity`                            |
| Re-validate attestations on a schedule (client sweep)            | Live                                          |
| ETH / USDC / Base resolution pairs                               | Live                                          |
| Public profile shows verified FIO                                | Live — `/u/$handle`                           |
| Public resolve server fn (no auth)                               | Live — `resolveFioPublic`                     |
| Register FIO in-app (custodial key / Registration API)           | Not yet — deep-link to FIO App                |
| Free handles on `*@aura` domain                                  | Partnership ask (Foundation)                  |
| TPID fee share on registrations                                  | Env `FIO_TPID` — set once we own a FIO handle |

Smoke: `node scripts/fio-smoke.mjs`

## Values filter for collabs

We collaborate with web3 projects when it aligns with:

1. **Honest utility** — real send/receive or identity, not fake airdrop theater
2. **Founder agency** — user owns keys / mappings; Aura never silent-sends
3. **Local + global** — Lokal seats and OS founders both benefit
4. **No pay-for-reviews / no dark patterns** — same compliance bar as Nachbar

Say yes to: wallets, payment rails, identity registries, DEXes that resolve FIO destinations,
FIO Foundation joint GTM, Base/ETH ecosystem apps that want human-readable pays.

Say no to: opaque token pumps, review farming, anything that needs us to custody user FIO keys
without a clear security model.

## Growth playbook (next)

1. **Register Aura's integrator FIO handle** (e.g. `aura@fiotoken` or our own domain) → set `FIO_TPID` / `VITE_FIO_TPID`.
2. **Public partner kit** — live at [`/partners/fio`](https://aibusiness.fun/partners/fio): shipped checklist, asks, copyable outreach email + downloadable markdown.
3. **Email FIO Partnerships** (`sales@fioprotocol.io`) using the kit draft for:
   - Free handles on domain `aura` (or `aibusiness`) for founding/Lokal seats
   - Listing + co-marketing budget
   - Registration Website API access
4. **Product soft-gates** (shipped): after wallet verify on `/identity`, toast nudges FIO; USDC send / Quant live / Yield live prompt if not attested.
5. **Collab kit**: expose `resolveFioPublic` to partners; document ETH/BASE/USDC pairs.
6. **Optional later**: FIO Request for “pay this mission” / Boost top-ups via handle.

## Env

```sh
FIO_TPID=                    # our FIO handle for fee share
FIO_DOMAIN=aura              # suggested domain in UI
FIO_REGISTER_URL=https://app.fio.net/ref/vxkgl
FIO_API_URL=                 # optional preferred API host
VITE_FIO_TPID=
VITE_FIO_DOMAIN=aura
VITE_FIO_REGISTER_URL=https://app.fio.net/ref/vxkgl
```

Docs: [dev.fio.net](https://dev.fio.net/) · [Benefits](https://dev.fio.net/docs/benefits-of-integration) · [TPID](https://dev.fio.net/docs/tpid) · Referral app: [app.fio.net/ref/vxkgl](https://app.fio.net/ref/vxkgl)
