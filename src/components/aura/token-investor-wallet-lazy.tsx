import { SaleWalletRoot } from "@/components/aura/sale-wallet";
import { TokenInvestorWalletStrip } from "@/components/aura/token-investor-wallet";

export function TokenInvestorWalletLazy({ locale }: { locale: "en" | "de" }) {
  return (
    <SaleWalletRoot
      wcName="AURA Token"
      wcDescription="Investor hub — pAURA balance and Hood gift status"
      wcUrl="https://aibusiness.fun/token"
    >
      <TokenInvestorWalletStrip locale={locale} />
    </SaleWalletRoot>
  );
}
