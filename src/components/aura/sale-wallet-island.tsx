import { SaleBuyPanel } from "@/components/aura/sale-buy-panel";
import { SaleKycGate } from "@/components/aura/sale-kyc-gate";
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
      <div className="space-y-4">
        <SaleKycGate>
          <SaleBuyPanel disabled={disabled} />
        </SaleKycGate>
        <PauraRedeemPanel locale={locale} />
      </div>
    </SaleWalletRoot>
  );
}
