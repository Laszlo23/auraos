import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/aura/primitives";
import { GenesisPassport } from "@/components/aura/genesis-passport";
import { RevenueWallet } from "@/components/aura/revenue-wallet";
import { TreasuryOverview } from "@/components/aura/treasury-overview";
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
      { title: "Wallet — deposit address & funds | Aura OS" },
      {
        name: "description",
        content:
          "Your smart-wallet deposit address, live USDC balance, recent activity, and agent session keys — clear and onchain.",
      },
      { property: "og:title", content: "Wallet — Aura OS treasury" },
      {
        property: "og:description",
        content: "Find your deposit address, see funds, and review every move.",
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
        eyebrow="Treasury"
        title="Your wallet, in plain view"
        description="Company revenue wallet (ledger) plus on-chain deposit address, balances, and session keys."
      />
      <RevenueWallet />
      <TreasuryOverview />
      <GenesisPassport
        companyName={company?.name}
        slug={economy?.slug}
        seat={progress?.seat_number}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <SessionKeysPanel
          walletId={(wallet as { id?: string } | null)?.id ?? null}
        />
        <HolderAdvantages perks={perks} />
      </div>
    </div>
  );
}
