import { useMemo, type ReactNode } from "react";
import { type Chain } from "viem";
import { robinhood, robinhoodTestnet } from "viem/chains";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import { clientCreatorChainId, clientCreatorRpcUrl } from "@/lib/creator-mint-chain";

function walletConnectId(): string {
  const raw = import.meta.env["VITE_WALLETCONNECT_PROJECT_ID"];
  return typeof raw === "string" ? raw.trim() : "";
}

function creatorWagmiChain(): Chain {
  return clientCreatorChainId() === 46630 ? robinhoodTestnet : robinhood;
}

export function CreatorWalletRoot({ children, slug }: { children: ReactNode; slug: string }) {
  const chain = creatorWagmiChain();
  const config = useMemo(() => {
    const projectId = walletConnectId();
    const mintUrl = `https://aibusiness.fun/c/${slug}`;
    return createConfig({
      chains: [chain],
      multiInjectedProviderDiscovery: false,
      connectors: [
        injected({ shimDisconnect: true }),
        ...(projectId
          ? [
              walletConnect({
                projectId,
                showQrModal: true,
                metadata: {
                  name: "Aura Creator Mint",
                  description: "Mint on Robinhood Chain",
                  url: mintUrl,
                  icons: ["https://aibusiness.fun/favicon.ico"],
                },
              }),
            ]
          : []),
      ],
      transports: { [chain.id]: http(clientCreatorRpcUrl()) },
      ssr: true,
    });
  }, [chain, slug]);

  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
