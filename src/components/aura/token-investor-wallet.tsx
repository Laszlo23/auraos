import { useMemo } from "react";
import { formatUnits } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import type { Connector } from "wagmi";
import { Link } from "@tanstack/react-router";

import {
  HOOD_ESCROW_ABI,
  HOOD_GIFT_AURA,
  HOOD_GIFT_DROP_ABI,
  HOOD_PASSPORT_ABI,
  genesisPassportAddress,
  launchEscrowAddress,
  launchGiftDropAddress,
} from "@/lib/aura-launch";
import { auraCaLive } from "@/lib/aura-token";
import { num } from "@/lib/format";
import {
  PAURA_SYMBOL,
  PRIVATE_SALE_ABI,
  pAuraToLaunchAura,
  privateSaleContractAddress,
} from "@/lib/private-sale";
import { truncateAddress } from "@/lib/siwe-display";

function preferConnector(connectors: readonly Connector[]): Connector | undefined {
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    unique.find((c) => c.type === "injected" || /metaMask|injected|rabby|brave/i.test(c.id)) ??
    unique.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    unique[0]
  );
}

export function TokenInvestorWalletStrip({ locale = "en" }: { locale?: "en" | "de" }) {
  const de = locale === "de";
  const contract = privateSaleContractAddress();
  const passport = genesisPassportAddress();
  const escrow = launchEscrowAddress();
  const gifts = launchGiftDropAddress();
  const caLive = auraCaLive();

  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const primary = useMemo(() => preferConnector(connectors), [connectors]);

  const pAuraBal = useReadContract({
    address: contract ?? undefined,
    abi: PRIVATE_SALE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(contract && address), refetchInterval: 15_000 },
  });

  const hoodBal = useReadContract({
    address: passport ?? undefined,
    abi: HOOD_PASSPORT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(passport && address), refetchInterval: 15_000 },
  });

  const launched = useReadContract({
    address: escrow ?? undefined,
    abi: HOOD_ESCROW_ABI,
    functionName: "launched",
    query: { enabled: Boolean(escrow), refetchInterval: 20_000 },
  });

  const t0 = useReadContract({
    address: gifts ?? undefined,
    abi: HOOD_GIFT_DROP_ABI,
    functionName: "t0",
    query: { enabled: Boolean(gifts), refetchInterval: 20_000 },
  });

  const pAuraWhole =
    pAuraBal.data != null ? Number(formatUnits(pAuraBal.data as bigint, 18)) : 0;
  const projectedAura = pAuraToLaunchAura(pAuraWhole);
  const hoodCount = hoodBal.data != null ? Number(hoodBal.data) : 0;
  const deskDeployed = Boolean(escrow && gifts && passport);
  const claimEnabled = Boolean(launched.data) && Boolean(t0.data && t0.data > 0n);

  const wrongChain = isConnected && chainId !== base.id;

  return (
    <section className="rounded-3xl border border-border/50 bg-foreground/[0.03] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
        {de ? "Wallet" : "Wallet"}
      </p>
      <h2 className="mt-2 font-display text-[clamp(1.35rem,5vw,1.85rem)] font-semibold leading-[1.05] tracking-tight">
        {de ? "Dein Early-Stand" : "Your early position"}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        {de
          ? "pAURA-Saldo und Hood-Gift-Checkliste — nur lesen. Kein erfundener CA."
          : "pAURA balance and Hood gift checklist — read-only. No invented CA."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isConnected ? (
          <button
            type="button"
            disabled={!primary || connecting}
            onClick={() => primary && connect({ connector: primary, chainId: base.id })}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {connecting
              ? de
                ? "Verbinde…"
                : "Connecting…"
              : de
                ? "Wallet verbinden"
                : "Connect wallet"}
          </button>
        ) : (
          <>
            <p className="font-mono text-[12px] text-muted-foreground">
              {truncateAddress(address ?? "")}
            </p>
            {wrongChain ? (
              <button
                type="button"
                disabled={switching}
                onClick={() => switchChain({ chainId: base.id })}
                className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold"
              >
                {de ? "Zu Base wechseln" : "Switch to Base"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-2xl border border-border/50 px-4 py-2 text-xs font-semibold text-muted-foreground"
            >
              {de ? "Trennen" : "Disconnect"}
            </button>
          </>
        )}
      </div>

      {isConnected && !wrongChain ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/40 px-3 py-3">
              <p className="num text-lg font-semibold">
                {pAuraBal.isLoading ? "…" : num(Math.floor(pAuraWhole))}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {PAURA_SYMBOL}
              </p>
            </div>
            <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] px-3 py-3">
              <p className="num text-lg font-semibold text-gold">
                {pAuraBal.isLoading ? "…" : num(Math.floor(projectedAura))}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {de ? "AURA bei T-0 (×1,11)" : "AURA at T-0 (×1.11)"}
              </p>
            </div>
          </div>

          {pAuraWhole > 0 ? (
            <p className="text-[13px] text-muted-foreground">
              {de ? (
                <>
                  Redeem nach T-0 auf{" "}
                  <Link to="/sale" className="font-semibold text-primary hover:underline">
                    /sale
                  </Link>
                  .
                </>
              ) : (
                <>
                  Redeem after T-0 on{" "}
                  <Link to="/sale" className="font-semibold text-primary hover:underline">
                    /sale
                  </Link>
                  .
                </>
              )}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {de ? (
                <>
                  Noch kein pAURA —{" "}
                  <Link to="/sale" className="font-semibold text-primary hover:underline">
                    jetzt kaufen
                  </Link>
                  .
                </>
              ) : (
                <>
                  No pAURA yet —{" "}
                  <Link to="/sale" className="font-semibold text-primary hover:underline">
                    buy now
                  </Link>
                  .
                </>
              )}
            </p>
          )}

          <div className="rounded-2xl border border-border/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              {de ? "Hood-Gift-Checkliste" : "Hood gift checklist"}
            </p>
            <ul className="mt-3 space-y-2 text-[13px]">
              <CheckRow
                ok={hoodCount > 0}
                label={
                  hoodCount > 0
                    ? de
                      ? `Hood in Wallet (${hoodCount}) → ${num(HOOD_GIFT_AURA * hoodCount)} AURA Gift`
                      : `Hood in wallet (${hoodCount}) → ${num(HOOD_GIFT_AURA * hoodCount)} AURA gift`
                    : de
                      ? "Kein Hood — Mint auf /hood"
                      : "No Hood — mint on /hood"
                }
                {...(hoodCount > 0 ? {} : { href: "/hood" })}
              />
              <CheckRow
                ok={deskDeployed}
                label={
                  deskDeployed
                    ? de
                      ? "Launch-Desk deployed (Escrow + Gift + Passport)"
                      : "Launch desk deployed (escrow + gift + passport)"
                    : de
                      ? "Launch-Desk noch nicht vollständig deployed"
                      : "Launch desk not fully deployed yet"
                }
              />
              <CheckRow
                ok={caLive}
                label={
                  caLive
                    ? de
                      ? "AURA CA live"
                      : "AURA CA live"
                    : de
                      ? "CA veröffentlicht bei T-0 — keine Screenshots vertrauen"
                      : "CA publishes at T-0 — never trust screenshots"
                }
              />
              <CheckRow
                ok={claimEnabled}
                label={
                  claimEnabled
                    ? de
                      ? "Gift-Claim freigeschaltet — auf /hood claimen"
                      : "Gift claim enabled — claim on /hood"
                    : de
                      ? "Gift unlocks at T-0 (Claim noch idle)"
                      : "Gift unlocks at T-0 (claim still idle)"
                }
                {...(claimEnabled ? { href: "/hood" } : {})}
              />
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CheckRow({
  ok,
  label,
  href,
}: {
  ok: boolean;
  label: string;
  href?: string;
}) {
  const mark = (
    <span className={ok ? "text-primary" : "text-muted-foreground/60"} aria-hidden>
      {ok ? "◆" : "◇"}
    </span>
  );
  return (
    <li className="flex items-start gap-2 leading-snug text-muted-foreground">
      {mark}
      {href ? (
        <Link to={href} className="font-medium text-foreground hover:text-primary hover:underline">
          {label}
        </Link>
      ) : (
        <span className={ok ? "text-foreground" : undefined}>{label}</span>
      )}
    </li>
  );
}
