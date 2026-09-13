import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { useLocale } from "@/hooks/use-locale";
import { num } from "@/lib/format";
import {
  BASE_USDC,
  ERC20_ABI,
  PRIVATE_SALE_ABI,
  PRIVATE_SALE_MIN_USDC,
  pAuraToLaunchAura,
  privateSaleContractAddress,
  usdcToPAura,
} from "@/lib/private-sale";
import { listedWalletDoors } from "@/lib/wallet-doors";

function BuyCard({ disabled }: { disabled: boolean }) {
  const { t } = useLocale();
  const contract = privateSaleContractAddress();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const doors = useMemo(() => listedWalletDoors(connectors), [connectors]);
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [amount, setAmount] = useState(String(PRIVATE_SALE_MIN_USDC));
  const usdc = Number(amount);
  const preview = useMemo(() => usdcToPAura(usdc), [usdc]);
  const launch = useMemo(() => pAuraToLaunchAura(preview), [preview]);
  const usdcRaw = Number.isFinite(usdc) && usdc > 0 ? parseUnits(String(usdc), 6) : 0n;

  const allowance = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && contract ? [address, contract] : undefined,
    query: { enabled: Boolean(address && contract) },
  });
  const usdcBal = useReadContract({
    address: BASE_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const approve = useWriteContract();
  const buy = useWriteContract();
  const pendingHash = approve.data ?? buy.data;
  const wait = useWaitForTransactionReceipt({ hash: pendingHash });

  const needsApprove = Boolean(contract && usdcRaw > 0n && (allowance.data ?? 0n) < usdcRaw);
  const onBase = chainId === base.id;
  const busy = connecting || switching || approve.isPending || buy.isPending || wait.isLoading;

  const run = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract missing");
      if (!onBase) {
        switchChain({ chainId: base.id });
        return;
      }
      if (needsApprove) {
        return approve.writeContractAsync({
          address: BASE_USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [contract, usdcRaw],
        });
      }
      return buy.writeContractAsync({
        address: contract,
        abi: PRIVATE_SALE_ABI,
        functionName: "buy",
        args: [usdcRaw],
      });
    },
  });

  return (
    <section className="rounded-3xl border border-primary/25 bg-foreground/[0.03] p-5">
      <h2 className="font-display text-xl font-semibold">{t("sale.buyTitle")}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t("sale.buyHint")}</p>
      <p className="mt-2 text-[12px] text-muted-foreground">{t("sale.needUsdc")}</p>

      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {t("sale.pickAmount")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[50, 111, 250, 500].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setAmount(String(n))}
            className={`rounded-2xl border px-3 py-1.5 text-[12px] font-semibold ${
              Number(amount) === n
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/50 text-muted-foreground"
            }`}
          >
            {n} USDC
          </button>
        ))}
      </div>
      <label className="mt-4 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {t("sale.amount")}
      </label>
      <input
        type="number"
        min={PRIVATE_SALE_MIN_USDC}
        step="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-base"
      />
      {preview > 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {t("sale.youGet", { paura: num(Math.round(preview)), launch: num(Math.round(launch)) })}
        </p>
      ) : null}
      {usdcBal.data != null ? (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          USDC {Number(usdcBal.data) / 1e6}
        </p>
      ) : null}

      {!isConnected ? (
        <div className="mt-5 grid gap-2">
          {doors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={connecting}
              onClick={() => connect({ connector })}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {connecting ? t("sale.connecting") : t("sale.connectWith", { name: connector.name })}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          <p className="break-all font-mono text-[11px] text-muted-foreground">{address}</p>
          {!onBase ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => switchChain({ chainId: base.id })}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("sale.switchBase")}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || busy || usdc < PRIVATE_SALE_MIN_USDC}
              onClick={() => run.mutate()}
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t("sale.buying") : needsApprove ? t("sale.approve") : t("sale.buy")}
            </button>
          )}
          <button
            type="button"
            onClick={() => disconnect()}
            className="w-full rounded-2xl border border-border/50 px-5 py-2.5 text-xs font-semibold"
          >
            {t("sale.disconnect")}
          </button>
        </div>
      )}
      {run.error ? (
        <p className="mt-3 text-[13px] text-red-400">
          {run.error instanceof Error ? run.error.message : t("sale.error")}
        </p>
      ) : null}
    </section>
  );
}

export function SaleBuyPanel({ disabled }: { disabled: boolean }) {
  return <BuyCard disabled={disabled} />;
}
