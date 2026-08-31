import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import type { Connector } from "wagmi";

import { supabase } from "@/integrations/supabase/client";
import { issueSiweChallenge, verifySiweAndBind, verifySiweAndSession } from "@/lib/siwe.functions";
import { truncateAddress } from "@/lib/siwe-display";

/** Prefer browser-injected wallet, then WalletConnect, then anything left. */
function preferConnector(connectors: readonly Connector[]): Connector | undefined {
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  return (
    unique.find((c) => c.type === "injected" || /metaMask|injected|rabby|brave/i.test(c.id)) ??
    unique.find((c) => /walletConnect/i.test(c.id) || c.type === "walletConnect") ??
    unique[0]
  );
}

export function AuthWalletPanel({
  mode,
  busy,
  onBusy,
  onBound,
  label,
}: {
  mode: "login" | "bind";
  busy?: boolean;
  onBusy?: (v: boolean) => void;
  onBound?: (address: string) => void;
  label?: string;
}) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [signing, setSigning] = useState(false);
  const locked = Boolean(busy || connecting || signing);

  const primary = useMemo(() => preferConnector(connectors), [connectors]);

  async function signIn() {
    if (!address) return;
    onBusy?.(true);
    setSigning(true);
    try {
      const bind = mode === "bind";
      const { message } = await issueSiweChallenge({ data: { address, bind } });
      const signature = await signMessageAsync({ message });
      if (bind) {
        const res = await verifySiweAndBind({ data: { address, message, signature } });
        toast.success(`Wallet bound · ${truncateAddress(res.address)}`);
        onBound?.(res.address);
        return;
      }
      const { tokenHash } = await verifySiweAndSession({
        data: { address, message, signature },
      });
      const { error } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: tokenHash,
      });
      if (error) throw error;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Wallet sign-in failed.";
      if (/reject|denied|user/i.test(raw) && /sign/i.test(raw)) {
        toast.error("Signature canceled.");
      } else {
        toast.error(raw);
      }
    } finally {
      setSigning(false);
      onBusy?.(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={locked || !primary}
          onClick={() => {
            if (!primary) {
              toast.error("No wallet connector available.");
              return;
            }
            connect({ connector: primary });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {connecting ? "Opening wallet…" : (label ?? "Continue with wallet")}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          MetaMask, Rabby, or WalletConnect. Sign-in costs no gas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-2.5 text-center font-mono text-[12px] text-foreground/90">
        {truncateAddress(address ?? "")}
      </p>
      <button
        type="button"
        disabled={locked}
        onClick={() => void signIn()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {signing
          ? "Check your wallet…"
          : mode === "bind"
            ? "Sign to bind wallet"
            : "Sign in with wallet"}
      </button>
      <button
        type="button"
        disabled={locked}
        onClick={() => disconnect()}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Use a different wallet
      </button>
    </div>
  );
}
