import { SaleBuyPanel } from "@/components/aura/sale-buy-panel";
import { PauraRedeemPanel } from "@/components/aura/paura-redeem";
import { SaleWalletRoot } from "@/components/aura/sale-wallet";

export function SaleWalletIsland({ disabled, locale }: { disabled: boolean; locale: "en" | "de" }) {
  return (
    <SaleWalletRoot>
      <div className="space-y-4">
        <SaleBuyPanel disabled={disabled} />
        <PauraRedeemPanel locale={locale} />
      </div>
    </SaleWalletRoot>
  );
}
