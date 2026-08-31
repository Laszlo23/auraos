import { useMemo, useState } from "react";
import { parseEther, formatEther } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AURA_PAURA_REDEEM_ABI,
  auraPauraRedeemAddress,
  pAuraToAuraAmount,
} from "@/lib/aura-self-launch";
import { ERC20_ABI, privateSaleContractAddress } from "@/lib/private-sale";

export function PauraRedeemPanel({ locale = "en" }: { locale?: "en" | "de" }) {
  const de = locale === "de";
  const redeem = auraPauraRedeemAddress();
  const paura = privateSaleContractAddress();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [amount, setAmount] = useState("");

  const openQ = useReadContract({
    address: redeem ?? undefined,
    abi: AURA_PAURA_REDEEM_ABI,
    functionName: "open",
    query: { enabled: Boolean(redeem) },
  });

  const balQ = useReadContract({
    address: paura ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(paura && address) },
  });

  const allowanceQ = useReadContract({
    address: paura ?? undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && redeem ? [address, redeem] : undefined,
    query: { enabled: Boolean(paura && redeem && address) },
  });

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const wait = useWaitForTransactionReceipt({ hash: txHash });

  const pAuraWei = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0n;
    try {
      return parseEther(String(n));
    } catch {
      return 0n;
    }
  }, [amount]);

  const auraOut = pAuraWei > 0n ? pAuraToAuraAmount(pAuraWei) : 0n;
  const needsApprove =
    redeem && pAuraWei > 0n && (allowanceQ.data == null || allowanceQ.data < pAuraWei);

  if (!redeem) {
    return (
      <p className="rounded-2xl border border-border/40 px-4 py-3 text-sm text-muted-foreground">
        {de
          ? "Redeem öffnet bei T-0, sobald AURA live ist."
          : "Redeem opens at T-0 once AURA is live."}
      </p>
    );
  }

  if (openQ.data === false) {
    return (
      <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
        {de
          ? "Redeem ist deployed, aber noch nicht freigeschaltet. Warte auf den offiziellen T-0-Call."
          : "Redeem is deployed but not open yet. Wait for the official T-0 call."}
      </p>
    );
  }

  async function onApprove() {
    if (!paura || !redeem || pAuraWei <= 0n) return;
    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
      await writeContractAsync({
        address: paura,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [redeem, pAuraWei],
        chainId: base.id,
      });
      toast.success(de ? "Freigabe gesendet" : "Approval sent");
      void allowanceQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "approve failed");
    }
  }

  async function onRedeem() {
    if (!redeem || pAuraWei <= 0n) return;
    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
      await writeContractAsync({
        address: redeem,
        abi: AURA_PAURA_REDEEM_ABI,
        functionName: "redeem",
        args: [pAuraWei],
        chainId: base.id,
      });
      toast.success(de ? "Redeem gesendet" : "Redeem sent");
      void balQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "redeem failed");
    }
  }

  return (
    <div className="space-y-3 rounded-[1.4rem] border border-gold/30 bg-[#07090e]/70 p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
        {de ? "T-0 Redeem" : "T-0 redeem"}
      </p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {de
          ? "1 pAURA → 1,11 AURA. Receipts gehen an die Dead-Adresse. Nur auf dem offiziellen Contract."
          : "1 pAURA → 1.11 AURA. Receipts go to the dead address. Official contract only."}
      </p>
      {isConnected && balQ.data != null ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          {de ? "Saldo" : "Balance"}: {Number(formatEther(balQ.data)).toLocaleString()} pAURA
        </p>
      ) : null}
      <input
        type="number"
        min={0}
        step="any"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={de ? "pAURA Menge" : "pAURA amount"}
        className="w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm"
      />
      {auraOut > 0n ? (
        <p className="text-[12px] text-foreground/90">
          → {Number(formatEther(auraOut)).toLocaleString()} AURA
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        {needsApprove ? (
          <button
            type="button"
            disabled={isPending || pAuraWei <= 0n}
            onClick={() => void onApprove()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gold/40 px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {de ? "pAURA freigeben" : "Approve pAURA"}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending || wait.isLoading || pAuraWei <= 0n || !isConnected}
            onClick={() => void onRedeem()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"
          >
            {isPending || wait.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {de ? "In AURA tauschen" : "Redeem for AURA"}
          </button>
        )}
      </div>
    </div>
  );
}
