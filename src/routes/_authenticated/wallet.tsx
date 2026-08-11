import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/aura/primitives";
import { GenesisPassport } from "@/components/aura/genesis-passport";
import { CompanyTokenLaunchPanel } from "@/components/aura/company-token-launch";
import { RevenueWallet } from "@/components/aura/revenue-wallet";
import { WalletDesk } from "@/components/aura/wallet-desk";
import { SessionKeysPanel } from "@/components/aura/smart-wallet";
import { HolderAdvantages } from "@/components/aura/trading/holder-advantages";
import { useMyHandle } from "@/hooks/use-identity";
import { useSmartWallet } from "@/hooks/use-earn";
import { useCompany } from "@/hooks/use-aura";
import { useProgress } from "@/hooks/use-progress";
import { getCompanyEconomy } from "@/lib/economy.functions";
import { getHolderPerks } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — balance, send, exchange | Aura OS" },
      {
        name: "description",
        content:
          "Your on-chain treasury: live balances, receive, send, exchange via OKX DEX, badges, and Genesis Passport.",
      },
      { property: "og:title", content: "Wallet — Aura OS" },
      {
        property: "og:description",
        content: "See balances. Receive, send, and exchange from your company smart wallet.",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { data: handle } = useMyHandle();
  const { data: wallet } = useSmartWallet(handle?.id);
  const { data: company } = useCompany();
  const { data: progress } = useProgress();
  const { data: economy } = useQuery({
    queryKey: ["company-economy"],
    queryFn: () => getCompanyEconomy(),
    staleTime: 15_000,
  });
  const { data: perks } = useQuery({
    queryKey: ["holder-perks"],
    queryFn: () => getHolderPerks(),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Wallet"
        title="Your money, on-chain"
        description="Balances, badges, receive, send, and exchange. Fund USDC on Base — keep a little ETH for gas until sponsorship is on."
      />
      <WalletDesk seat={progress?.seat_number} perks={perks} />
      <GenesisPassport
        companyName={company?.name}
        slug={economy?.slug}
        seat={progress?.seat_number}
      />
      <RevenueWallet compact />
      <div className="grid gap-5 lg:grid-cols-2">
        <SessionKeysPanel
          walletId={(wallet as { id?: string } | null)?.id ?? null}
        />
        <HolderAdvantages perks={perks} />
      </div>
      <details className="group rounded-[1.5rem] border border-border/40 bg-foreground/[0.03] px-5 py-4">
        <summary className="cursor-pointer list-none text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          More · company token launch
        </summary>
        <div className="mt-5">
          <CompanyTokenLaunchPanel />
        </div>
      </details>
    </div>
  );
}
