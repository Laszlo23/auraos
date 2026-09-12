# Launch Desk v2 — safety gate before mainnet executeMarket

Complete every box before calling `executeMarket()` on Base.

## Verify

- [ ] Basescan / Sourcify: Passport `0x28eab56b26d4020d0fe985aae96bc2a8dd98d99b`
- [ ] Basescan / Sourcify: Escrow `0x09aab7435ebf3e4b3763a1462279ab093d1268f8`
- [ ] Basescan / Sourcify: GiftDrop `0x09D20a80abcf7f23baa5138C2115AEbC846716C9` (`LOCK_DAYS == 0`)
- [ ] Confirm `launchDesk` and gift `desk` both point at escrow
- [ ] Verify AuraToken + AuraLpSink + AuraPauraRedeem after T-0 deploy

## Announce (48h)

- [ ] Publish Desk v2 + upcoming T-0 on aibusiness.fun
- [ ] Post CAs on X `@bihary41418`
- [ ] After `proposeV2Market`, wait full **72h** timelock (announce at least **48h** before execute)

## Fund & rehearse

- [ ] Sepolia: mint → propose → execute → `claim(tokenId)` → AURA in wallet
- [ ] Prefund GiftDrop with `7,777 × minted Hoods` (T-0 script)
- [ ] LP to `AuraLpSink` (no withdraw)
- [ ] VPS env pointed at Desk v2 CAs (`GENESIS_NFT_*`, `LAUNCH_ESCROW_*`, `LAUNCH_GIFT_LOCK_*`)

## After execute

- [ ] Hood owners claim via `/hood` Claim AURA UI
- [ ] `openRedeem()` on AuraPauraRedeem when CA is public
- [ ] Guardian renounce desk admin after FUNDER + metadata freeze
