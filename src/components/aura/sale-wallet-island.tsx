import { SaleBuyPanel } from "@/components/aura/sale-buy-panel";
import { SaleKycGate } from "@/components/aura/sale-kyc-gate";
import { SaleQuest } from "@/components/aura/sale-quest";
import { PauraRedeemPanel } from "@/components/aura/paura-redeem";
import { SaleWalletRoot } from "@/components/aura/sale-wallet";

export function SaleWalletIsland({
  disabled,
  locale,
}: {
  disabled: boolean;
  locale: "en" | "de";
}) {
  return (
    <SaleWalletRoot>
      <SaleQuest>
        <SaleKycGate>
          <SaleBuyPanel disabled={disabled} />
        </SaleKycGate>
        <PauraRedeemPanel locale={locale} />
      </SaleQuest>
    </SaleWalletRoot>
  );
}
