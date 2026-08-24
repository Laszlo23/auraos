import { useMemo, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

function walletConnectId(): string {
  const raw = import.meta.env["VITE_WALLETCONNECT_PROJECT_ID"];
  return typeof raw === "string" ? raw.trim() : "";
}

export function SaleWalletRoot({ children }: { children: ReactNode }) {
  const config = useMemo(() => {
    const projectId = walletConnectId();
    return createConfig({
      chains: [base],
      connectors: [
        injected({ shimDisconnect: true }),
        ...(projectId
          ? [walletConnect({ projectId, showQrModal: true, metadata: {
              name: "AURA Private Sale",
              description: "Buy pAURA on Base before the Clanker launch",
              url: "https://aibusiness.fun/sale",
              icons: ["https://aibusiness.fun/favicon.ico"],
            } })]
          : []),
      ],
      transports: { [base.id]: http() },
      ssr: true,
    });
  }, []);

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
