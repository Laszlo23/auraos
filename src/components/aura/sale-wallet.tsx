import { useMemo, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

function walletConnectId(): string {
  const raw = import.meta.env["VITE_WALLETCONNECT_PROJECT_ID"];
  return typeof raw === "string" ? raw.trim() : "";
}

export function SaleWalletRoot({
  children,
  wcName = "AURA Private Sale",
  wcDescription = "Buy pAURA on Base before the Uniswap v2 launch",
  wcUrl = "https://aibusiness.fun/sale",
}: {
  children: ReactNode;
  wcName?: string;
  wcDescription?: string;
  wcUrl?: string;
}) {
  const config = useMemo(() => {
    const projectId = walletConnectId();
    return createConfig({
      chains: [base],
      connectors: [
        injected({ shimDisconnect: true }),
        ...(projectId
          ? [
              walletConnect({
                projectId,
                showQrModal: true,
                metadata: {
                  name: wcName,
                  description: wcDescription,
                  url: wcUrl,
                  icons: ["https://aibusiness.fun/favicon.ico"],
                },
              }),
            ]
          : []),
      ],
      transports: { [base.id]: http() },
      ssr: true,
    });
  }, [wcName, wcDescription, wcUrl]);

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
